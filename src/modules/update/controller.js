const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { ZipArchive } = require('archiver')
const { db } = require('../../database/db')

const REPO_OWNER = 'ufukkay'
const REPO_NAME = 'ITManager'
const ROOT_DIR = path.join(__dirname, '../../../')
const BACKUP_DIR = path.join(ROOT_DIR, 'backups')
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend')
const WEBCONFIG_PATH = path.join(ROOT_DIR, 'web.config')

// Backup klasörünü oluştur
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// ── Güncelleme Durumu ─────────────────────────────────────
// In-memory durum; GET /api/update/status ile polling edilir ve
// app.js'teki bakım modu middleware'i tarafından okunur (inProgress === bakımda).
// iisnode başarılı bir güncelleme sonunda process'i recycle ettiğinde bu state
// zaten sıfırlanmış (yeni process) olarak yeniden başlar.
let updateState = {
  inProgress: false,
  steps: [],
  startedAt: null,
  finishedAt: null,
  success: null,
  error: null
}

const isMaintenanceMode = () => updateState.inProgress

// ── Mevcut Sürümü Getir ──────────────────────────────────
const getCurrentVersion = () => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

// ── GitHub'dan Güncel Sürümü Kontrol Et ─────────────────
const checkForUpdates = async (req, res) => {
  try {
    const https = require('https')
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`

    let data = {}
    try {
      data = await new Promise((resolve, reject) => {
        const options = { headers: { 'User-Agent': 'ITManager-UpdateChecker/1.0', 'Accept': 'application/vnd.github.v3+json' } }
        const request = https.get(url, options, (response) => {
          let body = ''
          response.on('data', chunk => body += chunk)
          response.on('end', () => {
            try { resolve(JSON.parse(body)) }
            catch (e) { reject(e) }
          })
        })
        request.on('error', reject)
      })
    } catch (e) {
      console.warn('GitHub releases API error:', e.message)
    }

    const currentVersion = getCurrentVersion()
    let latestVersion = (data.tag_name || '').replace(/^v/, '')

    const compareVersions = (a, b) => {
      if (!a) return 0
      const pa = a.split('.').map(Number)
      const pb = b.split('.').map(Number)
      for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return 1
        if ((pa[i] || 0) < (pb[i] || 0)) return -1
      }
      return 0
    }

    let hasUpdate = compareVersions(latestVersion, currentVersion) > 0
    let releaseName = data.name || ''
    let releaseNotes = data.body || ''

    if (!latestVersion) {
      try {
        const commitData = await new Promise((resolve, reject) => {
          const options = { headers: { 'User-Agent': 'ITManager-UpdateChecker/1.0', 'Accept': 'application/vnd.github.v3+json' } }
          https.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`, options, (response) => {
            let body = ''
            response.on('data', chunk => body += chunk)
            response.on('end', () => {
              try { resolve(JSON.parse(body)) }
              catch (e) { reject(e) }
            })
          }).on('error', reject)
        })

        if (commitData && commitData.sha) {
          const localCommit = await runCmd('git rev-parse HEAD', ROOT_DIR).catch(() => '')
          const shortRemote = commitData.sha.substring(0, 7)
          const shortLocal = (localCommit || '').trim().substring(0, 7)
          
          latestVersion = `v${currentVersion} (${shortRemote})`
          if (shortLocal && shortRemote && shortLocal !== shortRemote) {
            hasUpdate = true
            releaseName = `Güncelleme Mevcut (${shortRemote})`
            releaseNotes = commitData.commit?.message || 'Yeni güncellemeler mevcut.'
          }
        }
      } catch (commitErr) {
        console.warn('GitHub commit check error:', commitErr.message)
      }
    }

    res.json({
      currentVersion,
      latestVersion: latestVersion || currentVersion,
      hasUpdate,
      releaseName: releaseName || `v${currentVersion}`,
      releaseNotes: releaseNotes || 'Sisteminiz güncel durumda.',
      publishedAt: data.published_at || null,
      htmlUrl: data.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
      tagName: data.tag_name || `v${currentVersion}`
    })
  } catch (err) {
    console.error('Update check error:', err)
    res.status(500).json({ error: 'GitHub bağlantısı kurulamadı: ' + (err.message || 'Bilinmeyen hata') })
  }
}

// ── Paylaşılan Veritabanı Yedekleme Yardımcısı ──────────
// Hem manuel indirme (downloadDbBackup) hem de otomatik güncelleme öncesi (applyUpdate)
// tarafından kullanılır.
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
const getUpdateStatus = (req, res) => {
  const statusFile = path.join(ROOT_DIR, 'data', 'update-status.json')
  if (fs.existsSync(statusFile)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(statusFile, 'utf8'))
      return res.json({ ...updateState, ...fileData })
    } catch (e) {}
  }
  res.json(updateState)
}

// ── Yardımcılar ──────────────────────────────────────────
const runCmd = (cmd, cwd, timeoutMs = 300000) => new Promise((resolve, reject) => {
  exec(cmd, { cwd, timeout: timeoutMs, shell: 'cmd.exe', maxBuffer: 1024 * 1024 * 20 }, (err, stdout, stderr) => {
    if (err) reject(new Error(stderr || err.message))
    else resolve(stdout)
  })
})

const saveHistory = (entry) => {
  try {
    const historyFile = path.join(ROOT_DIR, 'update-history.json')
    let history = []
    if (fs.existsSync(historyFile)) history = JSON.parse(fs.readFileSync(historyFile, 'utf8'))
    history.push(entry)
    if (history.length > 50) history = history.slice(-50)
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2))
  } catch (e) { console.error('History save error:', e) }
}

// IIS: web.config touch → iisnode otomatik restart
const restartServer = (addLog) => {
  if (fs.existsSync(WEBCONFIG_PATH)) {
    addLog('IIS: web.config yenileniyor (restart tetikleniyor)...')
    try {
      const now = new Date()
      fs.utimesSync(WEBCONFIG_PATH, now, now)
      addLog('IIS: Restart sinyali gönderildi.')
      return
    } catch (e) {
      addLog('web.config touch hatası: ' + e.message)
    }
  }
  addLog('Sunucu process.exit(0) ile yeniden başlatılıyor...')
  setTimeout(() => process.exit(0), 1500)
}

// ── Güncelleme Uygula ────────────────────────────────────
const applyUpdate = async (req, res) => {
  if (updateState.inProgress) {
    return res.status(409).json({ error: 'Zaten devam eden bir güncelleme var. Lütfen tamamlanmasını bekleyin.' })
  }

  const currentVersion = getCurrentVersion()
  updateState = {
    inProgress: true,
    steps: [{ time: new Date().toISOString(), msg: 'Güncelleme süreci başlatıldı...' }],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    success: null,
    error: null
  }

  const statusFile = path.join(ROOT_DIR, 'data', 'update-status.json')
  try {
    fs.writeFileSync(statusFile, JSON.stringify(updateState, null, 2))
  } catch (e) {}

  res.json({
    success: true,
    message: 'Güncelleme başlatıldı. İlerlemeyi bu ekrandan takip edebilirsiniz.',
    currentVersion
  })

  const scriptPath = path.join(ROOT_DIR, 'deploy', 'update.ps1')
  if (fs.existsSync(scriptPath)) {
    console.log('[UPDATE] deploy/update.ps1 PowerShell scripti tetikleniyor...')
    exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, { cwd: ROOT_DIR }, (err, stdout, stderr) => {
      if (err) console.error('[UPDATE ERR]', stderr || err.message)
      else console.log('[UPDATE OUT]', stdout)
    })
    return
  }

  const addLog = (msg) => {
    updateState.steps.push({ time: new Date().toISOString(), msg })
    console.log('[UPDATE]', msg)
  }

  const historyEntry = {
    fromVersion: currentVersion,
    toVersion: (req.body && req.body.targetVersion) || 'main (son hali)',
    startedAt: updateState.startedAt,
    startedBy: req.session?.user?.full_name || req.session?.user?.username || 'sistem',
    status: 'started'
  }

  // İstek hemen yanıtlanır; gerçek ilerleme GET /api/update/status ile takip edilir.
  res.json({
    success: true,
    message: 'Güncelleme başlatıldı. İlerlemeyi bu ekrandan takip edebilirsiniz.',
    currentVersion
  })

  let preUpdateCommit = null

  try {
    addLog('Güncelleme başlatıldı, bakım modu aktif.')

    addLog('Veritabanı yedeği alınıyor...')
    const backup = await createDbBackup()
    addLog(`Veritabanı yedeği alındı: ${backup.fileName}`)

    addLog('Sunucu çalışma dizini temizlik kontrolü yapılıyor...')
    const gitStatusOut = await runCmd('git status --porcelain', ROOT_DIR)
    if (gitStatusOut.trim().length > 0) {
      throw new Error('Sunucuda commit edilmemiş değişiklikler tespit edildi, güncelleme güvenlik nedeniyle iptal edildi. Lütfen sunucudaki değişiklikleri manuel olarak inceleyin.')
    }
    addLog('Çalışma dizini temiz, devam ediliyor.')

    preUpdateCommit = (await runCmd('git rev-parse HEAD', ROOT_DIR)).trim()
    addLog(`Mevcut commit geri dönüş noktası olarak kaydedildi: ${preUpdateCommit.slice(0, 8)}`)

    addLog('Git: uzak değişiklikler çekiliyor...')
    await runCmd('git fetch origin', ROOT_DIR)
    await runCmd('git reset --hard origin/main', ROOT_DIR)
    addLog('Git: kod main branch\'inin son haline güncellendi.')

    addLog('NPM: backend bağımlılıkları yükleniyor...')
    await runCmd('npm install --production', ROOT_DIR)
    addLog('NPM: backend bağımlılıkları tamamlandı.')

    addLog('NPM: frontend bağımlılıkları yükleniyor...')
    await runCmd('npm install', FRONTEND_DIR)
    addLog('NPM: frontend build alınıyor...')
    await runCmd('npm run build', FRONTEND_DIR)
    addLog('Frontend build tamamlandı.')

    historyEntry.status = 'success'
    historyEntry.completedAt = new Date().toISOString()
    historyEntry.preUpdateCommit = preUpdateCommit
    historyEntry.log = updateState.steps
    saveHistory(historyEntry)

    updateState.success = true
    updateState.finishedAt = new Date().toISOString()

    addLog('Güncelleme başarılı! Sunucu yeniden başlatılıyor...')
    restartServer(addLog)
    // NOT: updateState.inProgress burada bilinçli olarak false yapılmıyor —
    // restartServer() ya process'i sonlandırıyor ya da iisnode'u recycle ediyor;
    // her iki durumda da yeni process temiz (inProgress: false) state ile başlayacak.

  } catch (err) {
    addLog('HATA: ' + err.message)

    // Kod zaten güncellenmiş (git reset tamamlanmış) ama sonraki bir adım
    // (npm install/build) başarısız olduysa, eski çalışan koda otomatik dön.
    if (preUpdateCommit) {
      try {
        addLog(`Otomatik geri dönüş (rollback) yapılıyor: ${preUpdateCommit.slice(0, 8)}`)
        await runCmd(`git reset --hard ${preUpdateCommit}`, ROOT_DIR)
        addLog('Geri dönüş tamamlandı, sunucu eski/çalışan koduyla devam ediyor.')
        historyEntry.rolledBack = true
      } catch (rollbackErr) {
        addLog('KRİTİK: Otomatik geri dönüş de başarısız oldu, manuel müdahale gerekiyor: ' + rollbackErr.message)
      }
    }

    historyEntry.status = 'failed'
    historyEntry.error = err.message
    historyEntry.completedAt = new Date().toISOString()
    historyEntry.preUpdateCommit = preUpdateCommit
    historyEntry.log = updateState.steps
    saveHistory(historyEntry)

    updateState.success = false
    updateState.error = err.message
    updateState.finishedAt = new Date().toISOString()
    // Restart tetiklenmeyecek (kod ya hiç değişmedi ya da rollback ile eski haline
    // döndü, mevcut process zaten doğru kodla çalışıyor) — bakım modu açıkça kapatılır.
    updateState.inProgress = false
  }
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
