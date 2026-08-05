const { db } = require('../../../database/db');

// Checkout asset to personnel or location
exports.checkoutAsset = (req, res) => {
    try {
        const { id } = req.params;
        const { target_type, target_id, notes } = req.body;

        if (!target_type || !target_id) {
            return res.status(400).json({ error: 'Lütfen zimmet hedef türünü ve hedefini belirtin.' });
        }

        // Durum kontrolü: Arızalı, Hurda, Kayıp vb. zimmetlenemesin
        const asset = db.prepare(`
            SELECT a.*, ast.name as status_name
            FROM assets a
            JOIN asset_statuses ast ON a.status_id = ast.id
            WHERE a.id = ?
        `).get(id);

        if (!asset) {
            return res.status(404).json({ error: 'Varlık bulunamadı.' });
        }

        const statusNameLower = (asset.status_name || '').toLowerCase();
        if (statusNameLower.includes('arıza') || statusNameLower.includes('hurda') || statusNameLower.includes('kayıp') || statusNameLower.includes('tamir') || statusNameLower.includes('servis')) {
            return res.status(400).json({ error: `Bu varlık şu an "${asset.status_name}" durumunda olduğu için zimmetlenemez!` });
        }

        let personnel_id = null;
        let location_id = null;
        let vehicle_id = null;

        if (target_type === 'PERSONNEL') {
            personnel_id = target_id;
        } else if (target_type === 'LOCATION') {
            location_id = target_id;
        } else if (target_type === 'VEHICLE') {
            vehicle_id = target_id;
        } else {
            return res.status(400).json({ error: 'Geçersiz zimmet türü.' });
        }

        // Zimmetli durumunu bul ya da varsayılan Zimmetli durumunu ayarla
        let statusInUse = db.prepare("SELECT id FROM asset_statuses WHERE (name LIKE '%Zimmet%' OR name LIKE '%Kullanımda%') AND name NOT LIKE '%Kullanım Dışı%' AND name NOT LIKE '%Arşiv%' LIMIT 1").get();
        if (!statusInUse) {
            const ins = db.prepare("INSERT INTO asset_statuses (name) VALUES ('Zimmetli (Kullanımda)')").run();
            statusInUse = { id: ins.lastInsertRowid };
        }
        const statusId = statusInUse.id;
        const userId = req.session?.user?.id || null;

        db.prepare(`
            UPDATE assets
            SET personnel_id = ?, location_id = ?, vehicle_id = ?, department_id = NULL, cost_center_id = NULL, status_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(personnel_id, location_id, vehicle_id, statusId, id);

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, target_id, notes, created_by)
            VALUES (?, 'CHECKOUT', ?, ?, ?, ?)
        `).run(id, target_type, target_id, notes || 'Zimmetlendi.', userId);

        // Eğer not eklenmişse arşiv notlarına da ekle
        if (notes && notes.trim()) {
            const userName = req.session?.user?.full_name || req.session?.user?.username || 'Sistem';
            db.prepare('INSERT INTO asset_notes (asset_id, user_name, note) VALUES (?, ?, ?)').run(id, userName, notes.trim());
        }

        res.json({ message: 'Varlık zimmetlendi ve durumu Zimmetli olarak güncellendi.' });
    } catch (err) {
        console.error('checkoutAsset error:', err);
        res.status(500).json({ error: 'Zimmetleme işlemi sırasında hata oluştu.' });
    }
};

// Checkin asset (Return to warehouse)
exports.checkinAsset = (req, res) => {
    try {
        const { id } = req.params;
        const { notes, status_id } = req.body;

        const statusAvailable = db.prepare("SELECT id FROM asset_statuses WHERE name LIKE '%Depo%' OR name LIKE '%Boşta%' LIMIT 1").get();
        const finalStatusId = status_id || (statusAvailable ? statusAvailable.id : 1);
        const userId = req.session?.user?.id || null;

        db.prepare(`
            UPDATE assets
            SET personnel_id = NULL, location_id = NULL, vehicle_id = NULL, department_id = NULL, cost_center_id = NULL, status_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(finalStatusId, id);

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes, created_by)
            VALUES (?, 'CHECKIN', 'NONE', ?, ?)
        `).run(id, notes || 'Depoya iade edildi.', userId);

        if (notes && notes.trim()) {
            const userName = req.session?.user?.full_name || req.session?.user?.username || 'Sistem';
            db.prepare('INSERT INTO asset_notes (asset_id, user_name, note) VALUES (?, ?, ?)').run(id, userName, notes.trim());
        }

        res.json({ message: 'Varlık depoya iade edildi.' });
    } catch (err) {
        console.error('checkinAsset error:', err);
        res.status(500).json({ error: 'İade işlemi sırasında hata oluştu.' });
    }
};
