const express = require('express')
const router = express.Router()
const { checkForUpdates, downloadDbBackup, listBackups, downloadServerBackup, applyUpdate, getUpdateHistory } = require('./controller')

// Tüm update endpoint'leri admin yetkisi gerektirir
const requireAdmin = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Giriş yapılmamış' })
  if (!req.session.user.is_admin) return res.status(403).json({ error: 'Admin yetkisi gerekli' })
  next()
}

// GitHub'dan güncel sürüm kontrolü
router.get('/check', requireAdmin, checkForUpdates)

// Güncelleme geçmişi
router.get('/history', requireAdmin, getUpdateHistory)

// DB Backup - hem indir hem sunucuya kaydet
router.get('/db-backup', requireAdmin, downloadDbBackup)

// Sunucudaki yedek listesi
router.get('/backups', requireAdmin, listBackups)

// Sunucudaki yedeği indir
router.get('/backups/:filename', requireAdmin, downloadServerBackup)

// Güncellemeyi uygula (git pull + npm install + restart)
router.post('/apply', requireAdmin, applyUpdate)

module.exports = router
