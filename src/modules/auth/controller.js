const { db } = require('../../database/db');
const bcrypt = require('bcryptjs');

// exports.getLogin = (req, res) => { ... } // Removed EJS version

exports.postLogin = (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email} from IP: ${req.ip}`);

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Geçersiz e-posta veya şifre.' });
        }

        if (user.is_active === 0) {
            return res.status(403).json({ success: false, message: 'Hesabınız dondurulmuştur (Pasif). Lütfen yöneticinizle iletişime geçin.' });
        }

        // Rol ismini al
        const role = db.prepare('SELECT name FROM roles WHERE id = ?').get(user.role_id);
        
        // Kullanıcının tüm yetkilerini al (Rol yetkileri + Bireysel override'lar)
        const permissions = db.prepare(`
            SELECT permission_key FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            UNION
            SELECT permission_key FROM permissions p
            JOIN user_permissions up ON p.id = up.permission_id
            WHERE up.user_id = ? AND up.granted = 1
        `).all(user.role_id, user.id).map(p => p.permission_key);

        req.session.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            role_id: user.role_id,
            role_name: role ? role.name : 'Unknown',
            permissions: permissions
        };

        return res.json({ success: true, user: req.session.user });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Oturum kapatıldı' });
    });
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'E-posta gerekli.' });

    try {
        const user = db.prepare('SELECT id, full_name, email, is_active FROM users WHERE email = ?').get(email);
        if (!user || user.is_active === 0) {
            // Güvenlik açısından "Kullanıcı bulunamadı/pasif" demek yerine başarılı mesajı veriyoruz
            return res.json({ success: true, message: 'Eğer sistemde kayıtlıysa, e-posta adresinize sıfırlama linki gönderildi.' });
        }

        const MailerService = require('../../services/MailerService');
        const result = await MailerService.sendPasswordResetEmail(user.email, user.full_name, false, user.id);

        if (result.success) {
            return res.json({ success: true, message: 'Eğer sistemde kayıtlıysa, e-posta adresinize sıfırlama linki gönderildi.' });
        } else {
            return res.status(500).json({ success: false, message: 'E-posta gönderilirken bir hata oluştu (SMTP ayarlarını kontrol edin).' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    }
};

exports.resetPassword = (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Eksik parametre.' });

    try {
        const crypto = require('crypto');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = db.prepare(`
            SELECT id, is_active FROM users
            WHERE reset_token = ? AND reset_expires IS NOT NULL AND reset_expires > datetime('now')
        `).get(hashedToken);

        if (!user) {
            return res.status(400).json({ success: false, message: 'Geçersiz veya süresi dolmuş bağlantı.' });
        }
        if (user.is_active === 0) {
            return res.status(403).json({ success: false, message: 'Hesabınız dondurulmuş (Pasif). Lütfen yöneticinizle iletişime geçin.' });
        }

        const hashedPass = bcrypt.hashSync(newPassword, 10);
        // Şifreyi güncelle ve token'ı tüket (tek kullanımlık) — aynı bağlantı bir daha kullanılamaz.
        db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(hashedPass, user.id);

        return res.json({ success: true, message: 'Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz.' });

    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    }
};

