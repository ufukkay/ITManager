const { db } = require('../database/db');

/**
 * Giriş yapan kullanıcının belirli bir yetkiye sahip olup olmadığını kontrol eden ara katman.
 * @param {string} permissionKey 
 */
const hasPermission = (permissionKey) => {
    return (req, res, next) => {
        if (!req.session.user) {
            // Eğer API isteğiyse JSON dön (veya 401)
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.path.includes('/api/')) {
                return res.status(401).json({ message: 'Oturum açmanız gerekmektedir.' });
            }
            return res.redirect('/auth/login');
        }

        const userRole = req.session.user.role_id;
        const userId = req.session.user.id;
        
        // Admin her zaman geçer
        if (userRole === 1) return next();

        // Yetki kontrolü: Rol yetkisi VAR MI ya da Kullanıcıya özel atanmış MI?
        const permission = db.prepare(`
            SELECT p.id 
            FROM permissions p
            LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = ?
            LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
            WHERE p.permission_key = ? 
            AND (rp.permission_id IS NOT NULL OR up.granted = 1)
        `).get(userRole, userId, permissionKey);

        if (!permission) {
            // Eğer API isteğiyse JSON dön
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({ message: 'Yetkiniz bulunmamaktadır.' });
            }
            return res.status(403).send('Bu işlem için yetkiniz bulunmamaktadır.');
        }

        next();
    };
};

module.exports = {
    hasPermission
};

