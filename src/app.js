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
    cookie: { secure: false } // HTTPS kullanılıyorsa true yapılmalı
}));



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
app.use('/admin', hasPermission('ADMIN_ACCESS'), require('./modules/admin/routes'));

// İzleme (Monitoring) Rotaları - 'wmic' hatası nedeniyle geçici olarak devre dışı
// app.use('/monitoring', hasPermission('MONITORING_VIEW'), require('./modules/monitoring/routes'));

// SIM Kart Takip Rotaları
app.use('/sim-takip', hasPermission('SIM_TAKIP_VIEW'), require('./modules/simcardtracking/routes/index'));

// HR Bildirim Rotaları (Personel Giriş/Çıkış)
app.use('/hr-requests', hasPermission('HR_REQUESTS_VIEW'), require('./modules/hr-requests/routes/index'));

app.listen(PORT, () => {
    console.log(`ITManager server running at http://localhost:${PORT}`);
});
