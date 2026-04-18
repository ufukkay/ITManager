const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { hasPermission } = require('../../middleware/auth');

// GET /admin/api/permissions - Yetkileri listele
router.get('/api/permissions', (req, res) => {
    const roles = db.prepare('SELECT * FROM roles').all();
    const permissions = db.prepare('SELECT * FROM permissions').all();
    const rolePermissions = db.prepare('SELECT * FROM role_permissions').all();

    res.json({
        success: true,
        roles,
        permissions,
        rolePermissions
    });
});

// GET /admin/permissions (Geriye dönük uyumluluk için - EJS dosyası silindiği için artık render edilmez)
router.get('/permissions', (req, res) => {
    const roles = db.prepare('SELECT * FROM roles').all();
    const permissions = db.prepare('SELECT * FROM permissions').all();
    const rolePermissions = db.prepare('SELECT * FROM role_permissions').all();

    res.render('admin/permissions', { 
        title: 'Yetki Yönetimi',
        roles,
        permissions,
        rolePermissions
    });
});

// POST /admin/api/permissions/update - Yetkileri güncelle
router.post('/api/permissions/update', (req, res) => {
    const { role_id, permission_ids } = req.body;
    
    if (!role_id) return res.status(400).json({ message: 'Role ID gerekli.' });

    try {
        const transaction = db.transaction(() => {
            // Mevcut yetkileri sil
            db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(role_id);
            
            // Yeni yetkileri ekle
            if (Array.isArray(permission_ids)) {
                const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
                permission_ids.forEach(pId => {
                    stmt.run(role_id, pId);
                });
            }
        });
        
        transaction();
        res.json({ success: true, message: 'Yetkiler başarıyla güncellendi.' });
    } catch (err) {
        console.error('Permission update error:', err);
        res.status(500).json({ message: 'Yetkiler güncellenirken bir hata oluştu.' });
    }
});

// GET /admin/api/users - Kullanıcıları listele
router.get('/api/users', (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
        `).all();
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ message: 'Kullanıcılar yüklenemedi.' });
    }
});

// POST /admin/api/users/update-role - Kullanıcı rolünü güncelle
router.post('/api/users/update-role', (req, res) => {
    const { user_id, role_id } = req.body;
    if (!user_id || !role_id) return res.status(400).json({ message: 'Eksik bilgi.' });

    try {
        db.prepare('UPDATE users SET role_id = ? WHERE id = ?').run(role_id, user_id);
        res.json({ success: true, message: 'Kullanıcı rolü güncellendi.' });
    } catch (err) {
        res.status(500).json({ message: 'Güncelleme hatası.' });
    }
});

module.exports = router;
