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
            SELECT u.id, u.email, u.username, u.full_name, u.role_id, r.name as role_name 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
        `).all();
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ message: 'Kullanıcılar yüklenemedi.' });
    }
});

// POST /admin/api/users/create - Yeni kullanıcı oluştur ve mail gönder
router.post('/api/users/create', async (req, res) => {
    const { full_name, email, role_id } = req.body;
    const bcrypt = require('bcryptjs');
    const MailerService = require('../../services/MailerService');

    if (!full_name || !email || !role_id) {
        return res.status(400).json({ message: 'Lütfen tüm alanları doldurun.' });
    }

    try {
        // Rastgele şifre oluştur (8 karakter)
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPass = bcrypt.hashSync(tempPassword, 10);

        const result = db.prepare(`
            INSERT INTO users (full_name, email, username, password, role_id) 
            VALUES (?, ?, ?, ?, ?)
        `).run(full_name, email, email, hashedPass, role_id);

        // Arka planda mail gönder (beklemeden cevap dönüyoruz ama hata kontrolü yapıyoruz)
        try {
            await MailerService.sendWelcomeEmail(email, full_name, tempPassword);
        } catch (mailErr) {
            console.error('Hoşgeldin maili gönderilemedi:', mailErr);
            // Mail gidememesi kullanıcı kaydını iptal etmez ama cevapta belirtilmeli
            return res.json({ 
                success: true, 
                message: 'Kullanıcı oluşturuldu ancak hoşgeldin maili gönderilemedi. Lütfen SMTP ayarlarını kontrol edin.',
                password: tempPassword // Mail gidemediği için şifreyi ekranda gösterelim
            });
        }

        res.json({ success: true, message: 'Kullanıcı başarıyla oluşturuldu ve hoşgeldin maili gönderildi.' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
        }
        console.error('User creation error:', err);
        res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.' });
    }
});

// GET /admin/api/settings/smtp - SMTP ayarlarını getir
router.get('/api/settings/smtp', (req, res) => {
    try {
        const settings = db.prepare('SELECT host, port, user, secure, from_email FROM smtp_settings ORDER BY id DESC LIMIT 1').get();
        res.json({ success: true, settings: settings || {} });
    } catch (err) {
        res.status(500).json({ message: 'Ayarlar yüklenemedi.' });
    }
});

// POST /admin/api/settings/smtp - SMTP ayarlarını kaydet
router.post('/api/settings/smtp', (req, res) => {
    const { host, port, user, pass, secure, from_email } = req.body;
    
    try {
        // Mevcut şifreyi korumak için kontrol (eğer pass boş gelmişse eskisini al)
        let finalPass = pass;
        if (!pass) {
            const old = db.prepare('SELECT pass FROM smtp_settings ORDER BY id DESC LIMIT 1').get();
            if (old) finalPass = old.pass;
        }

        db.prepare(`
            INSERT INTO smtp_settings (host, port, user, pass, secure, from_email) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(host, port, user, finalPass, secure ? 1 : 0, from_email);

        res.json({ success: true, message: 'SMTP ayarları kaydedildi.' });
    } catch (err) {
        res.status(500).json({ message: 'Kaydetme hatası.' });
    }
});

// POST /admin/api/settings/smtp/test - Test maili gönder
router.post('/api/settings/smtp/test', async (req, res) => {
    const MailerService = require('../../services/MailerService');
    const { email } = req.body;

    try {
        const result = await MailerService.sendMail(
            email, 
            'ITManager Pro - SMTP Test Mesajı', 
            'Bu bir test e-postasıdır. SMTP yapılandırmanız başarıyla tamamlanmıştır.'
        );

        if (result.success) {
            res.json({ success: true, message: 'Test maili başarıyla gönderildi.' });
        } else {
            res.status(500).json({ success: false, message: 'Test maili gönderilemedi: ' + result.error });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Test maili gönderilemedi: ' + err.message });
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

// GET /admin/api/users/:id/permissions - Kullanıcının kişisel yetkilerini getir
router.get('/api/users/:id/permissions', (req, res) => {
    const userId = parseInt(req.params.id);
    if (!userId) return res.status(400).json({ message: 'Geçersiz kullanıcı ID.' });

    try {
        // Kullanıcının kişisel override'larını al
        const userPerms = db.prepare(
            'SELECT permission_id, granted FROM user_permissions WHERE user_id = ?'
        ).all(userId);

        res.json({ success: true, userPermissions: userPerms });
    } catch (err) {
        console.error('User permissions fetch error:', err);
        res.status(500).json({ message: 'Yetkiler yüklenemedi.' });
    }
});

// POST /admin/api/users/:id/permissions - Kullanıcının kişisel yetkilerini kaydet
router.post('/api/users/:id/permissions', (req, res) => {
    const userId = parseInt(req.params.id);
    const { grantedIds } = req.body; // array of permission IDs that are granted

    if (!userId) return res.status(400).json({ message: 'Geçersiz kullanıcı ID.' });

    try {
        const transaction = db.transaction(() => {
            // Mevcut kişisel yetkileri temizle
            db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId);

            // Yeni yetkileri ekle
            if (Array.isArray(grantedIds) && grantedIds.length > 0) {
                const stmt = db.prepare(
                    'INSERT INTO user_permissions (user_id, permission_id, granted) VALUES (?, ?, 1)'
                );
                grantedIds.forEach(pId => {
                    stmt.run(userId, pId);
                });
            }
        });

        transaction();
        res.json({ success: true, message: 'Kullanıcı yetkileri kaydedildi.' });
    } catch (err) {
        console.error('User permissions update error:', err);
        res.status(500).json({ message: 'Yetkiler kaydedilemedi.' });
    }
});

module.exports = router;
