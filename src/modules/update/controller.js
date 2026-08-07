const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { ZipArchive } = require('archiver')
const { db } = require('../../database/db')

const REPO_OWNER = 'ufukkay'
const REPO_NAME = 'ITManager'
const ROOT_DIR = path.join(__dirname, '../../../')
const BACKUP_DIR = path.join(ROOT_DIR, 'backups')
const DATA_DIR = path.join(ROOT_DIR, 'data')
const STATUS_FILE = path.join(DATA_DIR, 'update-status.json')
const UPDATE_SCRIPT = path.join(ROOT_DIR, 'deploy', 'update.ps1')

// Backup klasörünü oluştur
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// ── Güncelleme Durumu ─────────────────────────────────────
// Tek gerçek kaynak: deploy/update.ps1 kendi ilerlemesini data/update-status.json'a yazar.
// Bu dosya, process yeniden başlasa (iisnode recycle) bile ilerlemeyi kaybetmemek için kullanılır.
// isMaintenanceMode() dosyadaki inProgress alanını okur (bellek içi state DEĞİL - script ayrı bir
// process olduğu için bellek içi bir state paylaşamıyoruz).
const readStatusFile = () => {
  if (!fs.existsSync(STATUS_FILE)) return { inProgress: false, steps: [], success: null, error: null }
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'))
  } catch {
    return { inProgress: false, steps: [], success: null, error: null }
  }
}

const isMaintenanceMode = () => readStatusFile().inProgress === true

const runCmd = (cmd, cwd, timeoutMs = 15000) => new Promise((resolve, reject) => {
  exec(cmd, { cwd, timeout: timeoutMs, shell: 'cmd.exe', maxBuffer: 1024 * 1024 * 10 }, (err, stdout) => {
    if (err) reject(err)
    else resolve(stdout.trim())
  })
})

const getCurrentVersion = () => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const githubApiGet = (urlPath) => new Promise((resolve, reject) => {
  const https = require('https')
  const options = { headers: { 'User-Agent': 'ITManager-UpdateChecker/1.0', 'Accept': 'application/vnd.github.v3+json' } }
  https.get(`https://api.github.com${urlPath}`, options, (response) => {
    let body = ''
    response.on('data', chunk => body += chunk)
    response.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch (e) { reject(e) }
    })
  }).on('error', reject)
})

// ── Güncelleme Kontrolü: yerel git HEAD ile GitHub'daki main'in HEAD'ini kıyaslar ──
// Sürüm etiketi/release GEREKTİRMEZ - "main'in son hali ile aynı mıyız?" sorusuna
// doğrudan commit SHA'sı üzerinden cevap verir. Basit ve güvenilir.
const checkForUpdates = async (req, res) => {
  try {
    const currentVersion = getCurrentVersion()

    let localSha = ''
    try {
      localSha = await runCmd('git rev-parse HEAD', ROOT_DIR)
    } catch (e) {
      console.warn('Yerel git HEAD okunamadı:', e.message)
    }

    let remoteData = {}
    try {
      remoteData = await githubApiGet(`/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`)
    } catch (e) {
      console.warn('GitHub commits API hatası:', e.message)
    }

    const remoteSha = remoteData.sha || ''
    const hasUpdate = !!(localSha && remoteSha && localSha !== remoteSha)

    res.json({
      currentVersion,
      currentCommit: localSha ? localSha.slice(0, 7) : null,
      latestCommit: remoteSha ? remoteSha.slice(0, 7) : null,
      hasUpdate,
      latestCommitMessage: remoteData.commit?.message || '',
      latestCommitDate: remoteData.commit?.author?.date || null,
      htmlUrl: remoteData.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}`
    })
  } catch (err) {
    console.error('Update check error:', err)
    res.status(500).json({ error: 'GitHub bağlantısı kurulamadı: ' + (err.message || 'Bilinmeyen hata') })
  }
}

// ── Paylaşılan Veritabanı Yedekleme Yardımcısı ──────────
// Hem manuel indirme (downloadDbBackup) hem de deploy/update.ps1'in kendi yedeği
// tarafından değil, sadece manuel indirme akışı tarafından kullanılır.
const createDbBackup = async () => {
  const currentVersion = getCurrentVersion()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupFileName = `itmanager_backup_v${currentVersion}_${timestamp}.db`
  const backupFilePath = path.join(BACKUP_DIR, backupFileName)

  await db.backup(backupFilePath)

  const zipFileName = backupFileName.replace('.db', '.zip')
  const zipFilePath = path.join(BACKUP_DIR, zipFileName)

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.file(backupFilePath, { name: backupFileName })
    archive.finalize()
  })

  if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath)

  return { fileName: zipFileName, filePath: zipFilePath }
}

const downloadDbBackup = async (req, res) => {
  try {
    const { fileName, filePath } = await createDbBackup()
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Type', 'application/zip')
    return res.download(filePath, fileName)
  } catch (err) {
    console.error('DB Backup error:', err)
    res.status(500).json({ error: 'DB yedek alınamadı: ' + (err.message || 'Bilinmeyen hata') })
  }
}

// ── Sunucu Yedeklerini Listele ───────────────────────────
const listBackups = async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([])
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.zip') || f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f))
        return { name: f, size: stat.size, createdAt: stat.birthtime || stat.mtime }
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json(files)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const downloadServerBackup = async (req, res) => {
  try {
    const { filename } = req.params
    if ((!filename.endsWith('.zip') && !filename.endsWith('.db')) || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Geçersiz dosya adı' })
    }
    const filePath = path.join(BACKUP_DIR, filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dosya bulunamadı' })
    res.download(filePath, filename)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── Güncelleme Geçmişini Getir ───────────────────────────
const getUpdateHistory = async (req, res) => {
  try {
    const historyFile = path.join(ROOT_DIR, 'update-history.json')
    if (!fs.existsSync(historyFile)) return res.json([])
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'))
    res.json(history.slice(-20).reverse())
  } catch {
    res.json([])
  }
}

// ── Güncelleme Anlık Durumu (polling) ────────────────────
// deploy/update.ps1 ayrı bir process olduğu için tüm durum data/update-status.json'dan okunur.
const getUpdateStatus = (req, res) => {
  res.json(readStatusFile())
}

// ── Güncelleme Uygula ────────────────────────────────────
// Tüm iş mantığı deploy/update.ps1'de yaşıyor (DB yedeği, kirli dizin kontrolü, git reset,
// npm install/build, hata durumunda rollback, IIS restart sinyali). Burada sadece script
// tetiklenir ve anlık durum data/update-status.json üzerinden polling ile takip edilir.
const applyUpdate = async (req, res) => {
  if (!fs.existsSync(UPDATE_SCRIPT)) {
    return res.status(500).json({ error: 'Güncelleme script\'i (deploy/update.ps1) bulunamadı.' })
  }

  const currentStatus = readStatusFile()
  if (currentStatus.inProgress) {
    return res.status(409).json({ error: 'Zaten devam eden bir güncelleme var. Lütfen tamamlanmasını bekleyin.' })
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(STATUS_FILE, JSON.stringify({
    inProgress: true,
    steps: [{ time: new Date().toISOString(), msg: 'Güncelleme başlatıldı, script tetikleniyor...' }],
    startedAt: new Date().toISOString(),
    startedBy: req.session?.user?.full_name || req.session?.user?.username || 'sistem',
    success: null,
    error: null
  }, null, 2))

  res.json({ success: true, message: 'Güncelleme başlatıldı. İlerlemeyi bu ekrandan takip edebilirsiniz.' })

  exec(`powershell.exe -ExecutionPolicy Bypass -File "${UPDATE_SCRIPT}"`, { cwd: ROOT_DIR }, (err, stdout, stderr) => {
    if (err) console.error('[UPDATE] update.ps1 hata ile sonlandı:', stderr || err.message)
    else console.log('[UPDATE] update.ps1 tamamlandı.')

    // Güvenlik ağı: update.ps1 kendi try/catch'i içinde her zaman inProgress=false yazar,
    // ANCAK powershell.exe hiç başlayamazsa/parse edilemezse (bulunamadı, exec policy,
    // syntax hatası) script'in try bloğuna hiç girilmez ve status dosyası hiç güncellenmez —
    // arayüz sonsuza kadar "güncelleniyor" gösterir. Script çıktıktan sonra dosya hâlâ
    // inProgress:true ise (script kendi hata durumunu yazamamış demektir) burada zorla kapatılır.
    const finalStatus = readStatusFile()
    if (err && finalStatus.inProgress) {
      fs.writeFileSync(STATUS_FILE, JSON.stringify({
        ...finalStatus,
        inProgress: false,
        success: false,
        error: `Güncelleme script'i başlatılamadı veya beklenmedik şekilde sonlandı: ${(stderr || err.message || '').slice(0, 500)}`
      }, null, 2))
    }
  })
}

module.exports = {
  checkForUpdates,
  downloadDbBackup,
  listBackups,
  downloadServerBackup,
  applyUpdate,
  getUpdateHistory,
  getUpdateStatus,
  isMaintenanceMode
}
