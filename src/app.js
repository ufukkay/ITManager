require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./database/db');
const { hasPermission } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Veritabanını Başlat
initDb();

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
// (Headless API - Ön yüz artık Vite tabanlı olduğu için kök dizin yönlendirmesi kaldırıldı)

// Kimlik Doğrulama Rotaları
app.use('/auth', require('./modules/auth/routes'));

// Yönetim Rotaları
app.use('/admin', hasPermission('system:admin'), require('./modules/admin/routes'));

// İzleme (Monitoring) Rotaları
app.use('/monitoring', hasPermission('monitoring:view'), require('./modules/monitoring/routes'));

// SIM Kart Takip Rotaları
app.use('/sim-takip', hasPermission('sim:view'), require('./modules/simcardtracking/routes/index'));

// HR Bildirim Rotaları (Personel Giriş/Çıkış)
app.use('/api/hr-requests', hasPermission('hr:view'), require('./modules/hr-requests/routes/index'));

// M365 Lisans Yönetimi Rotaları
app.use('/api/m365', require('./modules/m365/routes'));

// Merkezi Master Data Rotaları
app.use('/api/master-data', require('./modules/core/routes'));

app.listen(PORT, () => {
    console.log(`ITManager server running at http://localhost:${PORT}`);
});

