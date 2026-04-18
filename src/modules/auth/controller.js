const { db } = require('../../database/db');
const bcrypt = require('bcryptjs');

// exports.getLogin = (req, res) => { ... } // Removed EJS version

exports.postLogin = (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username} on port ${process.env.PORT || 3000}`);

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre.' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role_id: user.role_id
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
