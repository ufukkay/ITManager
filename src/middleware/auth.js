const { db } = require('../database/db');

/**
 * Giriş yapan kullanıcının belirli bir yetkiye sahip olup olmadığını kontrol eden ara katman.
 * @param {string} permissionKey 
 */
const hasPermission = (permissionKey) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/auth/login');
        }

        const userRole = req.session.user.role_id;
        
        // Rolün istenen yetkiye sahip olup olmadığını kontrol et
        const permission = db.prepare(`
            SELECT p.permission_key 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ? AND p.permission_key = ?
        `).get(userRole, permissionKey);

        if (!permission && req.session.user.role_id !== 1) { // 1 = Admin, her zaman izin verilir veya yetki kontrolü yapılır
            // Eğer API isteğiyse JSON dön
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
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
