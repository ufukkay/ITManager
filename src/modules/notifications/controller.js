const notificationService = require('../../services/notificationService');

exports.list = (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const notifications = notificationService.getForUser(req.session.user.id, limit);
        res.json({ success: true, notifications });
    } catch (err) {
        console.error('notifications list error:', err);
        res.status(500).json({ success: false, message: 'Bildirimler alınamadı.' });
    }
};

exports.unreadCount = (req, res) => {
    try {
        const count = notificationService.getUnreadCount(req.session.user.id);
        res.json({ success: true, count });
    } catch (err) {
        console.error('notifications unread-count error:', err);
        res.status(500).json({ success: false, count: 0 });
    }
};

exports.markRead = (req, res) => {
    try {
        notificationService.markRead(req.params.id, req.session.user.id);
        res.json({ success: true });
    } catch (err) {
        console.error('notifications markRead error:', err);
        res.status(500).json({ success: false });
    }
};

exports.markAllRead = (req, res) => {
    try {
        notificationService.markAllRead(req.session.user.id);
        res.json({ success: true });
    } catch (err) {
        console.error('notifications markAllRead error:', err);
        res.status(500).json({ success: false });
    }
};
