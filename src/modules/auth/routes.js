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

router.get('/api/dashboard/stats', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthenticated' });
    }
    
    try {
        const { db } = require('../../database/db');
        
        // 1. Active Support Tickets Count
        const activeTicketsResult = db.prepare(`
            SELECT COUNT(*) as count 
            FROM helpdesk_tickets 
            WHERE status NOT IN ('Çözüldü', 'Kapalı')
        `).get();
        const activeTicketsCount = activeTicketsResult ? activeTicketsResult.count : 0;
        
        // 2. Active Server Alerts
        const activeAlertsResult = db.prepare(`
            SELECT COUNT(*) as count 
            FROM servers 
            WHERE status = 'offline' OR cpu_usage > 90 OR ram_usage > 90
        `).get();
        const activeAlertsCount = activeAlertsResult ? activeAlertsResult.count : 0;
        
        // 3. Total Monthly Costs for the latest available period (month)
        const latestPeriodResult = db.prepare(`
            SELECT period FROM invoices ORDER BY period DESC LIMIT 1
        `).get();
        
        let totalMonthlyCost = 0;
        let latestPeriod = '';
        if (latestPeriodResult) {
            latestPeriod = latestPeriodResult.period;
            const costResult = db.prepare(`
                SELECT SUM(total_amount) as total 
                FROM invoices 
                WHERE period = ?
            `).get(latestPeriod);
            totalMonthlyCost = costResult ? (costResult.total || 0) : 0;
        }

        res.json({
            activeTickets: activeTicketsCount,
            activeAlerts: activeAlertsCount,
            totalMonthlyCost: totalMonthlyCost,
            latestPeriod: latestPeriod
        });
    } catch (err) {
        console.error('Dashboard stats API error:', err);
        res.status(500).json({ error: 'Dashboard verileri alınamadı.' });
    }
});
router.post('/api/login', authController.postLogin);
router.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid'); // Varsayılan oturum çerezi isminin kullanıldığı varsayılıyor
        res.json({ success: true, message: 'Logged out successfully' });
    });
});
router.post('/api/forgot-password', authController.forgotPassword);
router.post('/api/reset-password', authController.resetPassword);

module.exports = router;

