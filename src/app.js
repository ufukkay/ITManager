require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./database/db');
const { isMaintenanceMode } = require('./modules/update/controller');

const app = express();
const PORT = process.env.PORT || 3000;

// Veritabanını Başlat
initDb();

// Bakım Modu Ara Katmanı — her şeyden önce çalışır (body-parser/session'dan bile önce).
// Bir güncelleme sürerken (src/modules/update/controller.js -> applyUpdate) devreye girer;
// admin'in ilerlemeyi izleyebilmesi için /api/update/status ve /api/update/history hariç
// tüm istekleri karşılar.
const MAINTENANCE_ALLOWLIST = ['/api/update/status', '/api/update/history'];
app.use((req, res, next) => {
    if (!isMaintenanceMode()) return next();
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
        maxAge: 24 * 60 * 60 * 1000 // 1 gün (milisaniye cinsinden)
    }
}));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Kullanıcı Verileri İçin Global Ara Katman
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Rota Tanımlamaları
// Kimlik Doğrulama Rotaları
app.use('/auth', require('./modules/auth/routes'));


// IT Destek Merkezi (Help Desk)
app.use('/api/helpdesk', require('./modules/helpdesk/routes'));

// Yönetim Rotaları
app.use('/admin', require('./modules/admin/routes'));

// İzleme (Monitoring) Rotaları
app.use('/monitoring', require('./modules/monitoring/routes'));

// SIM Kart Takip Rotaları
app.use('/sim-takip', require('./modules/simcardtracking/routes/index'));

// HR Bildirim Rotaları (Personel Giriş/Çıkış)
app.use('/api/hr-requests', require('./modules/hr-requests/routes/index'));

// M365 Lisans Yönetimi Rotaları
app.use('/api/m365', require('./modules/m365/routes'));

// Envanter Takip Rotaları
app.use('/api/assets', require('./modules/assets/routes'));

// Merkezi Master Data Rotaları
app.use('/api/master-data', require('./modules/core/routes'));

// Sistem Güncelleme Rotaları
app.use('/api/update', require('./modules/update/routes'));

// Frontend (Vue SPA) - production build'i statik olarak sun
// IIS/iisnode tüm istekleri bu process'e yönlendirir; API route'ları eşleşmeyen
// her şey burada karşılanır: önce statik dosya (js/css/img) varsa o sunulur,
// yoksa Vue Router (history mode) için index.html'e düşülür.
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/api\/|\/auth\/|\/admin\/|\/monitoring\/|\/sim-takip\/|\/uploads\/).*/, (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
        if (err) next(err);
    });
});

// Global Hata Yakalama Ara Katmanı
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Sunucu tarafında beklenmeyen bir hata oluştu.' });
});

app.listen(PORT, () => {
    console.log(`ITManager server running at http://localhost:${PORT}`);
    
    // Start Mail Fetcher Service
    const mailFetcher = require('./services/MailFetcherService');
    mailFetcher.start();
});
