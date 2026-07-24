const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const archiver = require('archiver')
const { getDb } = require('../../database/db')

const REPO_OWNER = 'ufukkay'
const REPO_NAME = 'ITManager'
const ROOT_DIR = path.join(__dirname, '../../../')
const BACKUP_DIR = path.join(ROOT_DIR, 'backups')

// Backup klasörünü oluştur
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

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

    const data = await new Promise((resolve, reject) => {
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

    const currentVersion = getCurrentVersion()
    const latestVersion = (data.tag_name || '').replace(/^v/, '')

    const compareVersions = (a, b) => {
      const pa = a.split('.').map(Number)
      const pb = b.split('.').map(Number)
      for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return 1
        if ((pa[i] || 0) < (pb[i] || 0)) return -1
      }
      return 0
    }

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    res.json({
      currentVersion,
      latestVersion,
      hasUpdate,
      releaseName: data.name || '',
      releaseNotes: data.body || '',
      publishedAt: data.published_at || null,
      htmlUrl: data.html_url || '',
      tagName: data.tag_name || ''
    })
  } catch (err) {
    console.error('Update check error:', err)
    res.status(500).json({ error: 'GitHub bağlantısı kurulamadı: ' + (err.message || 'Bilinmeyen hata') })
  }
}

// ── DB Backup: Hem İndir hem Sunucuya Kaydet ─────────────
const downloadDbBackup = async (req, res) => {
  try {
    const db = getDb()
    const currentVersion = getCurrentVersion()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFileName = `itmanager_backup_v${currentVersion}_${timestamp}.db`
    const backupFilePath = path.join(BACKUP_DIR, backupFileName)

    // 1. Sunucuya atomic backup (better-sqlite3)
    await db.backup(backupFilePath)

    // 2. Zip oluştur
    const zipFileName = backupFileName.replace('.db', '.zip')
    const zipFilePath = path.join(BACKUP_DIR, zipFileName)

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath)
      const archive = archiver('zip', { zlib: { level: 9 } })
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)
      archive.file(backupFilePath, { name: backupFileName })
      archive.finalize()
    })

    // 3. Ham .db dosyasını temizle (zip saklı kalır)
    if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath)

    // 4. Tarayıcıya gönder
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`)
    res.setHeader('Content-Type', 'application/zip')
    res.download(zipFilePath, zipFileName)
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
      .filter(f => f.endsWith('.zip'))
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

// ── Sunucudaki Yedeği İndir ──────────────────────────────
const downloadServerBackup = async (req, res) => {
  try {
    const { filename } = req.params
    if (!filename.endsWith('.zip') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
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

// ── Güncelleme Uygula ────────────────────────────────────
const applyUpdate = async (req, res) => {
  const { targetVersion } = req.body || {}
  const currentVersion = getCurrentVersion()

  const logEntry = {
    fromVersion: currentVersion,
    toVersion: targetVersion || 'latest',
    startedAt: new Date().toISOString(),
    startedBy: req.session?.user?.name || 'sistem',
    status: 'started',
    log: []
  }

  const addLog = (msg) => {
    logEntry.log.push({ time: new Date().toISOString(), msg })
    console.log('[UPDATE]', msg)
  }

  try {
    res.json({ success: true, message: 'Güncelleme başlatıldı. Sunucu yakında yeniden başlayacak.', currentVersion })

    setTimeout(async () => {
      try {
        addLog('Güncelleme başlatıldı...')

        // 1. git pull
        addLog('Git: Uzak değişiklikler çekiliyor...')
        await execCmd('git fetch origin', ROOT_DIR)
        await execCmd('git pull origin main', ROOT_DIR)
        addLog('Git: Kod güncellendi.')

        // 2. npm install
        addLog('NPM: Bağımlılıklar yükleniyor...')
        await execCmd('npm install --production', ROOT_DIR)
        addLog('NPM: Bağımlılıklar tamamlandı.')

        // 3. Geçmişi kaydet
        logEntry.status = 'success'
        logEntry.completedAt = new Date().toISOString()
        saveHistory(logEntry)
        addLog('Güncelleme başarılı! Sunucu yeniden başlatılıyor...')

        // 4. IIS restart
        restartServer(addLog)

      } catch (err) {
        addLog('HATA: ' + err.message)
        logEntry.status = 'failed'
        logEntry.error = err.message
        logEntry.completedAt = new Date().toISOString()
        saveHistory(logEntry)
      }
    }, 500)

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
}

// ── Yardımcılar ──────────────────────────────────────────
const execCmd = (cmd, cwd) => new Promise((resolve, reject) => {
  exec(cmd, { cwd, timeout: 120000, shell: 'cmd.exe' }, (err, stdout, stderr) => {
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
// Yoksa process.exit ile restart
const restartServer = (addLog) => {
  const webConfigPath = path.join(ROOT_DIR, 'web.config')
  if (fs.existsSync(webConfigPath)) {
    addLog('IIS: web.config yenileniyor (restart tetikleniyor)...')
    try {
      const now = new Date()
      fs.utimesSync(webConfigPath, now, now)
      addLog('IIS: Restart sinyali gönderildi.')
      return
    } catch (e) {
      addLog('web.config touch hatası: ' + e.message)
    }
  }
  addLog('Sunucu process.exit(0) ile yeniden başlatılıyor...')
  setTimeout(() => process.exit(0), 1500)
}

module.exports = { checkForUpdates, downloadDbBackup, listBackups, downloadServerBackup, applyUpdate, getUpdateHistory }
