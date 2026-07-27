require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./database/db');
const updateController = require('./modules/update/controller');

const app = express();
const PORT = process.env.PORT || 3000;

// Veritabanını Başlat
initDb();

// Bakım Modu Ara Katmanı (Güvenli kontrol)
const MAINTENANCE_ALLOWLIST = ['/api/update/status', '/api/update/history'];
app.use((req, res, next) => {
    const isMaintenance = typeof updateController?.isMaintenanceMode === 'function' && updateController.isMaintenanceMode();
    if (!isMaintenance) return next();
    if (MAINTENANCE_ALLOWLIST.some((p) => req.path.startsWith(p))) return next();

    const wantsJson = req.xhr
        || (req.headers.accept && req.headers.accept.indexOf('json') > -1)
        || req.originalUrl.startsWith('/api/')
        || req.originalUrl.startsWith('/auth/');

    if (wantsJson) {
        return res.status(503).json({
            maintenance: true,
            message: 'Sistem güncelleniyor, lütfen birkaç dakika sonra tekrar deneyin.'
        });
    }
    return res.sendFile(path.join(__dirname, 'public/maintenance.html'));
});

// Ara Katman (Middleware) Yapılandırması
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'itmanager-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // HTTPS kullanılıyorsa true yapılmalı
        maxAge: 24 * 60 * 60 * 1000 // 1 gün
    }
}));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Kullanıcı Verileri İçin Global Ara Katman
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Rota Tanımlamaları
app.use('/auth', require('./modules/auth/routes'));
app.use('/api/helpdesk', require('./modules/helpdesk/routes'));
app.use('/admin', require('./modules/admin/routes'));
app.use('/monitoring', require('./modules/monitoring/routes'));
app.use('/sim-takip', require('./modules/simcardtracking/routes/index'));
app.use('/api/hr-requests', require('./modules/hr-requests/routes/index'));
app.use('/api/m365', require('./modules/m365/routes'));
app.use('/api/assets', require('./modules/assets/routes'));
app.use('/api/master-data', require('./modules/core/routes'));
app.use('/api/update', require('./modules/update/routes'));

// Frontend (Vue SPA) - production build'i statik olarak sun
// API/auth route'ları eşleşmeyen (typo'lu/bilinmeyen) istekler burada HTML almasın diye
// SPA fallback sadece bu önekler DIŞINDAKİ GET isteklerinde devreye giriyor.
const API_PREFIXES = ['/api/', '/auth/', '/admin/', '/monitoring/', '/sim-takip/', '/uploads/'];
const frontendDist = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.use((req, res, next) => {
    if (req.method !== 'GET' || API_PREFIXES.some((p) => req.path.startsWith(p))) {
        return next();
    }
    const indexPath = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    res.status(404).send(`Frontend build bulunamadı: ${indexPath}`);
});

// Global Hata Yakalama Ara Katmanı
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: err.message || 'Sunucu tarafında beklenmeyen bir hata oluştu.' });
});

app.listen(PORT, () => {
    console.log(`ITManager server running at http://localhost:${PORT}`);
    
    // Mail Fetcher Service
    try {
        const mailFetcher = require('./services/MailFetcherService');
        if (mailFetcher && typeof mailFetcher.start === 'function') mailFetcher.start();
    } catch (e) {
        console.error('MailFetcherService failed to load:', e.message);
    }

    // Photo Reminder Service
    try {
        const photoReminder = require('./services/PhotoReminderService');
        if (photoReminder && typeof photoReminder.start === 'function') photoReminder.start();
    } catch (e) {
        console.error('PhotoReminderService failed to load:', e.message);
    }
});
