const { db } = require('../database/db');

/**
 * Bir kullanıcıya bildirim oluşturur.
 * @param {Object} params
 * @param {number} params.userId
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} [params.message]
 * @param {string} [params.link]
 */
const create = ({ userId, type, title, message, link }) => {
    if (!userId) return;
    try {
        db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, type, title, message || null, link || null);
    } catch (err) {
        console.error('Notification create error:', err);
    }
};

/**
 * Aynı bildirimi birden fazla kullanıcı için oluşturur.
 * @param {number[]} userIds
 * @param {Object} payload - { type, title, message, link }
 */
const createForUsers = (userIds, payload) => {
    (userIds || []).forEach(userId => create({ ...payload, userId }));
};

/** Aktif Admin kullanıcılarının id listesini döner (role_id = 1). */
const getAdminUserIds = () => {
    try {
        return db.prepare("SELECT id FROM users WHERE role_id = 1 AND (is_active IS NULL OR is_active = 1)").all().map(r => r.id);
    } catch (err) {
        console.error('getAdminUserIds error:', err);
        return [];
    }
};

const getForUser = (userId, limit = 20) => {
    return db.prepare(`
        SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(userId, limit);
};

const getUnreadCount = (userId) => {
    return db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0`).get(userId).c;
};

const markRead = (id, userId) => {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(id, userId);
};

const markAllRead = (userId) => {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`).run(userId);
};

module.exports = {
    create,
    createForUsers,
    getAdminUserIds,
    getForUser,
    getUnreadCount,
    markRead,
    markAllRead,
};
