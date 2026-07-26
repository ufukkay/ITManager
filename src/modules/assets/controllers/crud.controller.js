const { db } = require('../../../database/db');

// List all assets with enriched brand, model, category, status, company, user, and location info
exports.getAssets = (req, res) => {
    try {
        const query = `
            SELECT
                a.*,
                am.name as model_name,
                am.category_id as category_id,
                am.brand_id as brand_id,
                ac.name as category_name,
                ab.name as brand_name,
                as_t.name as status_name,
                c.name as company_name,
                p.first_name || ' ' || p.last_name as personnel_name,
                l.name as location_name
            FROM assets a
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_categories ac ON am.category_id = ac.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            JOIN asset_statuses as_t ON a.status_id = as_t.id
            JOIN companies c ON a.company_id = c.id
            LEFT JOIN personnel p ON a.personnel_id = p.id
            LEFT JOIN locations l ON a.location_id = l.id
            ORDER BY a.created_at DESC
        `;
        const assets = db.prepare(query).all();
        res.json(assets);
    } catch (err) {
        console.error('getAssets error:', err);
        res.status(500).json({ error: 'Varlıklar listesi alınırken hata oluştu.' });
    }
};

// Add a new asset
exports.addAsset = (req, res) => {
    try {
        const { serial_no, barcode, model_id, status_id, company_id, purchase_price, purchase_date, lifetime_months, notes, mac_address, ip_address, cpu_model, ram_gb, disk_gb, os_version, specs_json } = req.body;

        if (!serial_no || !model_id || !status_id || !company_id) {
            return res.status(400).json({ error: 'Lütfen zorunlu alanları (Seri No, Model, Durum, Şirket) doldurun.' });
        }

        // Seri No ve Barkod çakışma kontrolü
        const existingSerial = db.prepare('SELECT id FROM assets WHERE serial_no = ?').get(serial_no.trim());
        if (existingSerial) {
            return res.status(400).json({ error: `"${serial_no}" seri numarasına sahip başka bir varlık zaten mevcut!` });
        }

        if (barcode && barcode.trim()) {
            const existingBarcode = db.prepare('SELECT id FROM assets WHERE barcode = ?').get(barcode.trim());
            if (existingBarcode) {
                return res.status(400).json({ error: `"${barcode}" barkod numarasına sahip başka bir varlık zaten mevcut!` });
            }
        }

        // Amortisman süresi geçmediyse alış bedeli 0 girilemez
        const pPrice = parseFloat(purchase_price) || 0;
        const pLifetime = parseInt(lifetime_months) || 60;
        if (purchase_date) {
            const pDate = new Date(purchase_date);
            const now = new Date();
            const diffMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
            if (diffMonths < pLifetime && pPrice <= 0) {
                return res.status(400).json({ error: 'Faydalı ömrü (amortisman süresi) henüz dolmamış varlıklar için alış bedeli 0 olarak girilemez! Lütfen geçerli bir bedel yazınız.' });
            }
        } else if (pPrice <= 0) {
            return res.status(400).json({ error: 'Varlık için alış/amortisman bedeli 0 girilemez! Lütfen geçerli bir bedel yazınız.' });
        }

        const invoice_path = req.files && req.files.invoice ? '/uploads/assets/' + req.files.invoice[0].filename : null;
        const warranty_path = req.files && req.files.warranty ? '/uploads/assets/' + req.files.warranty[0].filename : null;
        const formattedSpecs = typeof specs_json === 'object' ? JSON.stringify(specs_json) : (specs_json || null);
        const userId = req.session?.user?.id || null;

        const info = db.prepare(`
            INSERT INTO assets (serial_no, barcode, model_id, status_id, company_id, purchase_price, purchase_date, lifetime_months, invoice_path, warranty_path, notes, mac_address, ip_address, cpu_model, ram_gb, disk_gb, os_version, specs_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            serial_no.trim(), barcode ? barcode.trim() : null, model_id, status_id, company_id, pPrice, purchase_date || null, pLifetime, invoice_path, warranty_path, notes || null,
            mac_address || null, ip_address || null, cpu_model || null, ram_gb ? Number(ram_gb) : null, disk_gb ? Number(disk_gb) : null, os_version || null, formattedSpecs
        );

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes, created_by)
            VALUES (?, 'CREATE', 'NONE', 'Varlık oluşturuldu.', ?)
        `).run(info.lastInsertRowid, userId);

        res.json({ id: info.lastInsertRowid, serial_no, message: 'Varlık başarıyla oluşturuldu.' });
    } catch (err) {
        console.error('addAsset error:', err);
        res.status(500).json({ error: 'Varlık eklenirken veritabanı hatası oluştu.' });
    }
};

// Update existing asset
exports.updateAsset = (req, res) => {
    try {
        const { id } = req.params;
        const { serial_no, barcode, model_id, status_id, company_id, purchase_price, purchase_date, lifetime_months, notes, mac_address, ip_address, cpu_model, ram_gb, disk_gb, os_version, specs_json } = req.body;

        const currentAsset = db.prepare('SELECT invoice_path, warranty_path FROM assets WHERE id = ?').get(id);
        if (!currentAsset) {
            return res.status(404).json({ error: 'Varlık bulunamadı.' });
        }

        // Amortisman süresi geçmediyse alış bedeli 0 girilemez
        const pPrice = parseFloat(purchase_price) || 0;
        const pLifetime = parseInt(lifetime_months) || 60;
        if (purchase_date) {
            const pDate = new Date(purchase_date);
            const now = new Date();
            const diffMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
            if (diffMonths < pLifetime && pPrice <= 0) {
                return res.status(400).json({ error: 'Faydalı ömrü (amortisman süresi) henüz dolmamış varlıklar için alış bedeli 0 olarak girilemez! Lütfen geçerli bir bedel yazınız.' });
            }
        } else if (pPrice <= 0) {
            return res.status(400).json({ error: 'Varlık için alış/amortisman bedeli 0 girilemez! Lütfen geçerli bir bedel yazınız.' });
        }

        const invoice_path = req.files && req.files.invoice ? '/uploads/assets/' + req.files.invoice[0].filename : currentAsset.invoice_path;
        const warranty_path = req.files && req.files.warranty ? '/uploads/assets/' + req.files.warranty[0].filename : currentAsset.warranty_path;
        const formattedSpecs = typeof specs_json === 'object' ? JSON.stringify(specs_json) : (specs_json || null);
        const userId = req.session?.user?.id || null;

        db.prepare(`
            UPDATE assets
            SET serial_no = ?, barcode = ?, model_id = ?, status_id = ?, company_id = ?, purchase_price = ?, purchase_date = ?, lifetime_months = ?, invoice_path = ?, warranty_path = ?, notes = ?, mac_address = ?, ip_address = ?, cpu_model = ?, ram_gb = ?, disk_gb = ?, os_version = ?, specs_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            serial_no, barcode || null, model_id, status_id, company_id, pPrice, purchase_date || null, pLifetime, invoice_path, warranty_path, notes || null,
            mac_address || null, ip_address || null, cpu_model || null, ram_gb ? Number(ram_gb) : null, disk_gb ? Number(disk_gb) : null, os_version || null, formattedSpecs,
            id
        );

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes, created_by)
            VALUES (?, 'UPDATE', 'NONE', 'Varlık bilgileri güncellendi.', ?)
        `).run(id, userId);

        res.json({ message: 'Varlık başarıyla güncellendi.' });
    } catch (err) {
        console.error('updateAsset error:', err);
        res.status(500).json({ error: 'Varlık güncellenirken veritabanı hatası oluştu.' });
    }
};

// Delete asset
exports.deleteAsset = (req, res) => {
    try {
        const { id } = req.params;
        const notes = (req.body?.notes || req.query?.notes || '').trim();

        const asset = db.prepare(`
            SELECT a.*, ast.name as status_name
            FROM assets a
            JOIN asset_statuses ast ON a.status_id = ast.id
            WHERE a.id = ?
        `).get(id);

        if (!asset) {
            return res.status(404).json({ error: 'Varlık bulunamadı.' });
        }

        // Zimmet / Kullanım durumu kontrolü
        if (asset.personnel_id || asset.location_id) {
            return res.status(400).json({ error: 'Bu cihaz zimmetlidir! Silme işleminden önce zimmeti depoya iade almalısınız.' });
        }

        const statusLower = (asset.status_name || '').toLowerCase();
        if (statusLower.includes('zimmet') || statusLower.includes('kullanım')) {
            return res.status(400).json({ error: 'Kullanımda/Zimmette görünen varlıklar silinemez. Lütfen önce durumunu Depo/Boşta olarak değiştirin.' });
        }

        if (!notes) {
            return res.status(400).json({ error: 'Varlığı silmek için geçerli bir silme açıklaması / nedeni belirtmelisiniz.' });
        }

        const userId = req.session?.user?.id || null;
        const userName = req.session?.user?.full_name || req.session?.user?.username || 'Sistem';

        // Audit log kaydı (Silinmeden önceki arşiv için)
        db.prepare(`
            INSERT INTO audit_logs (user_id, module, action, resource_id, details)
            VALUES (?, 'ENVANTER', 'DELETE', ?, ?)
        `).run(userId, String(id), JSON.stringify({ serial_no: asset.serial_no, barcode: asset.barcode, deletion_note: notes, deleted_by: userName }));

        db.prepare('DELETE FROM asset_logs WHERE asset_id = ?').run(id);
        db.prepare('DELETE FROM asset_notes WHERE asset_id = ?').run(id);
        db.prepare('DELETE FROM assets WHERE id = ?').run(id);

        res.json({ message: 'Varlık başarıyla silindi.' });
    } catch (err) {
        console.error('deleteAsset error:', err);
        res.status(500).json({ error: 'Varlık silinirken hata oluştu.' });
    }
};
