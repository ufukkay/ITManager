const { db } = require('../../database/db');
const bcrypt = require('bcryptjs');

// exports.getLogin = (req, res) => { ... } // Removed EJS version

exports.postLogin = (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Geçersiz e-posta veya şifre.' });
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

