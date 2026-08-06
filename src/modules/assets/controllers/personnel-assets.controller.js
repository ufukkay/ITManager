const { db } = require('../../../database/db');

// Get logged-in user's assets
exports.getMyAssets = (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = db.prepare('SELECT personnel_id FROM users WHERE id = ?').get(userId);

        if (!user || !user.personnel_id) {
            return res.json({ active: [], history: [] });
        }

        const personnelId = user.personnel_id;

        const activeAssets = db.prepare(`
            SELECT a.*,
                   am.name as model_name,
                   ab.name as brand_name,
                   ac.name as category_name,
                   ast.name as status_name,
                   v.plate_no,
                   CASE WHEN a.personnel_id IS NULL AND a.vehicle_id IS NOT NULL THEN 1 ELSE 0 END as is_via_vehicle
            FROM assets a
            LEFT JOIN asset_models am ON a.model_id = am.id
            LEFT JOIN asset_brands ab ON am.brand_id = ab.id
            LEFT JOIN asset_categories ac ON am.category_id = ac.id
            LEFT JOIN asset_statuses ast ON a.status_id = ast.id
            LEFT JOIN vehicles v ON a.vehicle_id = v.id
            WHERE a.personnel_id = ? OR a.vehicle_id IN (SELECT id FROM vehicles WHERE personnel_id = ?)
        `).all(personnelId, personnelId);

        const historyLogs = db.prepare(`
            SELECT l.*,
                   a.serial_no,
                   am.name as model_name,
                   ab.name as brand_name
            FROM asset_logs l
            JOIN assets a ON l.asset_id = a.id
            LEFT JOIN asset_models am ON a.model_id = am.id
            LEFT JOIN asset_brands ab ON am.brand_id = ab.id
            WHERE (l.target_type = 'PERSONNEL' AND l.target_id = ?)
               OR (l.target_type = 'VEHICLE' AND l.target_id IN (SELECT id FROM vehicles WHERE personnel_id = ?))
            ORDER BY l.created_at DESC
        `).all(personnelId, personnelId);

        res.json({
            active: activeAssets,
            history: historyLogs
        });
    } catch (err) {
        console.error('getMyAssets error:', err);
        res.status(500).json({ error: 'Kendi zimmetleriniz alınırken hata oluştu.' });
    }
};

// Personnel Assets
exports.getPersonnelAssets = (req, res) => {
    try {
        const { id } = req.params;

        const active = db.prepare(`
            SELECT
                a.id, a.serial_no, a.barcode, a.phone_no, a.purchase_price, a.purchase_date,
                am.name as model_name, ab.name as brand_name, ac.name as category_name,
                v.plate_no,
                CASE WHEN a.personnel_id IS NULL AND a.vehicle_id IS NOT NULL THEN 1 ELSE 0 END as is_via_vehicle
            FROM assets a
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            JOIN asset_categories ac ON am.category_id = ac.id
            LEFT JOIN vehicles v ON a.vehicle_id = v.id
            WHERE a.personnel_id = ? OR a.vehicle_id IN (SELECT id FROM vehicles WHERE personnel_id = ?)
        `).all(id, id);

        const history = db.prepare(`
            SELECT
                al.id, al.action, al.notes, al.created_at,
                a.serial_no, a.barcode,
                am.name as model_name, ab.name as brand_name,
                u.full_name as user_name
            FROM asset_logs al
            JOIN assets a ON al.asset_id = a.id
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            LEFT JOIN users u ON al.created_by = u.id
            WHERE (al.target_type = 'PERSONNEL' AND al.target_id = ?)
               OR (al.target_type = 'VEHICLE' AND al.target_id IN (SELECT id FROM vehicles WHERE personnel_id = ?))
            ORDER BY al.created_at DESC
        `).all(id, id);

        res.json({ active, history });
    } catch (err) {
        console.error('getPersonnelAssets error:', err);
        res.status(500).json({ error: 'Personel zimmet bilgileri alınamadı.' });
    }
};
