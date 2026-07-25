const express = require('express')
const router = express.Router()
const { checkForUpdates, downloadDbBackup, listBackups, downloadServerBackup, applyUpdate, getUpdateHistory } = require('./controller')

const { hasPermission } = require('../../middleware/auth')

// Tüm update endpoint'leri system:admin yetkisi gerektirir (role_id === 1 veya yetki)
const requireAdmin = hasPermission('system:admin')

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
