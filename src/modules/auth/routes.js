const express = require('express');
const router = express.Router();
const authController = require('./controller');

// router.get('/login', authController.getLogin); // EJS versiyonu kaldırıldı
router.post('/login', authController.postLogin);
router.get('/logout', authController.logout);

// Frontend API Rotaları
router.get('/api/me', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ success: false, message: 'Unauthenticated' });
    }
});
router.post('/api/login', authController.postLogin);
router.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid'); // Varsayılan oturum çerezi isminin kullanıldığı varsayılıyor
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

module.exports = router;
