const { db } = require('../../database/db');

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
        const { serial_no, barcode, model_id, status_id, company_id, purchase_price, purchase_date, lifetime_months, notes } = req.body;
        
        if (!serial_no || !model_id || !status_id || !company_id) {
            return res.status(400).json({ error: 'Lütfen zorunlu alanları (Seri No, Model, Durum, Şirket) doldurun.' });
        }

        // Multer upload file paths
        const invoice_path = req.files && req.files.invoice ? '/uploads/assets/' + req.files.invoice[0].filename : null;
        const warranty_path = req.files && req.files.warranty ? '/uploads/assets/' + req.files.warranty[0].filename : null;

        const info = db.prepare(`
            INSERT INTO assets (serial_no, barcode, model_id, status_id, company_id, purchase_price, purchase_date, lifetime_months, invoice_path, warranty_path, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(serial_no, barcode || null, model_id, status_id, company_id, purchase_price || 0, purchase_date || null, lifetime_months || 60, invoice_path, warranty_path, notes || null);

        // Write log
        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes)
            VALUES (?, 'CREATE', 'NONE', 'Varlık oluşturuldu.')
        `).run(info.lastInsertRowid);

        res.json({ id: info.lastInsertRowid, message: 'Varlık başarıyla eklendi.' });
    } catch (err) {
        console.error('addAsset error:', err);
        res.status(500).json({ error: 'Varlık eklenirken hata oluştu veya seri numarası/barkod zaten mevcut.' });
    }
};

// Update an asset
exports.updateAsset = (req, res) => {
    try {
        const { id } = req.params;
        const { serial_no, barcode, model_id, status_id, company_id, purchase_price, purchase_date, lifetime_months, notes } = req.body;

        if (!serial_no || !model_id || !status_id || !company_id) {
            return res.status(400).json({ error: 'Lütfen zorunlu alanları doldurun.' });
        }

        // Get existing asset to retain file paths if no new file is uploaded
        const currentAsset = db.prepare('SELECT invoice_path, warranty_path FROM assets WHERE id = ?').get(id);
        
        let invoice_path = currentAsset ? currentAsset.invoice_path : null;
        let warranty_path = currentAsset ? currentAsset.warranty_path : null;

        if (req.files && req.files.invoice) {
            invoice_path = '/uploads/assets/' + req.files.invoice[0].filename;
        }
        if (req.files && req.files.warranty) {
            warranty_path = '/uploads/assets/' + req.files.warranty[0].filename;
        }

        db.prepare(`
            UPDATE assets 
            SET serial_no = ?, barcode = ?, model_id = ?, status_id = ?, company_id = ?, purchase_price = ?, purchase_date = ?, lifetime_months = ?, invoice_path = ?, warranty_path = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(serial_no, barcode || null, model_id, status_id, company_id, purchase_price || 0, purchase_date || null, lifetime_months || 60, invoice_path, warranty_path, notes || null, id);

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes)
            VALUES (?, 'UPDATE', 'NONE', 'Varlık detayları güncellendi.')
        `).run(id);

        res.json({ message: 'Varlık başarıyla güncellendi.' });
    } catch (err) {
        console.error('updateAsset error:', err);
        res.status(500).json({ error: 'Varlık güncellenirken hata oluştu.' });
    }
};

// Delete an asset
exports.deleteAsset = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM assets WHERE id = ?').run(id);
        res.json({ message: 'Varlık başarıyla silindi.' });
    } catch (err) {
        console.error('deleteAsset error:', err);
        res.status(500).json({ error: 'Varlık silinirken hata oluştu.' });
    }
};

// Checkout (Zimmetle)
exports.checkoutAsset = (req, res) => {
    try {
        const { id } = req.params;
        const { target_type, target_id, notes } = req.body; // target_type: 'PERSONNEL' or 'LOCATION'

        if (!target_type || !target_id) {
            return res.status(400).json({ error: 'Lütfen zimmetlenecek hedef tipi ve hedefi seçin.' });
        }

        const statusInUse = db.prepare("SELECT id FROM asset_statuses WHERE name LIKE '%Zimmetlendi%' OR name LIKE '%Kullanımda%'").get();
        const statusId = statusInUse ? statusInUse.id : 2;

        if (target_type === 'PERSONNEL') {
            db.prepare('UPDATE assets SET personnel_id = ?, location_id = NULL, status_id = ? WHERE id = ?').run(target_id, statusId, id);
        } else if (target_type === 'LOCATION') {
            db.prepare('UPDATE assets SET location_id = ?, personnel_id = NULL, status_id = ? WHERE id = ?').run(target_id, statusId, id);
        }

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, target_id, notes)
            VALUES (?, 'CHECKOUT', ?, ?, ?)
        `).run(id, target_type, target_id, notes || 'Zimmet atandı.');

        res.json({ message: 'Varlık başarıyla zimmetlendi.' });
    } catch (err) {
        console.error('checkoutAsset error:', err);
        res.status(500).json({ error: 'Zimmet ataması yapılırken hata oluştu.' });
    }
};

// Checkin (Zimmeti Geri Al / Depoya Çek)
exports.checkinAsset = (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const statusInWarehouse = db.prepare("SELECT id FROM asset_statuses WHERE name LIKE '%Depoda%' OR name LIKE '%Boşta%'").get();
        const statusId = statusInWarehouse ? statusInWarehouse.id : 1;

        db.prepare('UPDATE assets SET personnel_id = NULL, location_id = NULL, status_id = ? WHERE id = ?').run(statusId, id);

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes)
            VALUES (?, 'CHECKIN', 'NONE', ?)
        `).run(id, notes || 'Depoya iade edildi.');

        res.json({ message: 'Varlık başarıyla depoya iade edildi.' });
    } catch (err) {
        console.error('checkinAsset error:', err);
        res.status(500).json({ error: 'Zimmet iadesi yapılırken hata oluştu.' });
    }
};

// Financial summary (Total Cost & Monthly Amortization)
exports.getFinancialSummary = (req, res) => {
    try {
        const assets = db.prepare(`SELECT purchase_price, purchase_date, lifetime_months FROM assets`).all();
        
        let totalValuation = 0;
        let totalMonthlyCost = 0;
        const now = new Date();

        assets.forEach(a => {
            const price = a.purchase_price || 0;
            totalValuation += price;

            if (price > 0 && a.purchase_date && a.lifetime_months) {
                const pDate = new Date(a.purchase_date);
                const diffMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
                
                // If lifetime is not yet expired, calculate monthly cost
                if (diffMonths < a.lifetime_months && diffMonths >= 0) {
                    totalMonthlyCost += price / a.lifetime_months;
                }
            }
        });

        res.json({
            totalValuation: Math.round(totalValuation * 100) / 100,
            monthlyAmortization: Math.round(totalMonthlyCost * 100) / 100
        });
    } catch (err) {
        console.error('getFinancialSummary error:', err);
        res.status(500).json({ error: 'Finansal özet alınamadı.' });
    }
};

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
                   ast.name as status_name
            FROM assets a
            LEFT JOIN asset_models am ON a.model_id = am.id
            LEFT JOIN asset_brands ab ON am.brand_id = ab.id
            LEFT JOIN asset_categories ac ON am.category_id = ac.id
            LEFT JOIN asset_statuses ast ON a.status_id = ast.id
            WHERE a.personnel_id = ?
        `).all(personnelId);

        const historyLogs = db.prepare(`
            SELECT l.*, 
                   a.serial_no,
                   am.name as model_name,
                   ab.name as brand_name
            FROM asset_logs l
            JOIN assets a ON l.asset_id = a.id
            LEFT JOIN asset_models am ON a.model_id = am.id
            LEFT JOIN asset_brands ab ON am.brand_id = ab.id
            WHERE l.target_type = 'PERSONNEL' AND l.target_id = ?
            ORDER BY l.created_at DESC
        `).all(personnelId);

        res.json({
            active: activeAssets,
            history: historyLogs
        });
    } catch (err) {
        console.error('getMyAssets error:', err);
        res.status(500).json({ error: 'Kendi zimmetleriniz alınırken hata oluştu.' });
    }
};

// Help-data configurations (Dropdown structures)
exports.getMetadata = (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM asset_categories ORDER BY name').all();
        const brands = db.prepare('SELECT * FROM asset_brands ORDER BY name').all();
        const statuses = db.prepare('SELECT * FROM asset_statuses ORDER BY name').all();
        const companies = db.prepare('SELECT id, name FROM companies ORDER BY name').all();
        const locations = db.prepare('SELECT id, name FROM locations ORDER BY name').all();
        const personnel = db.prepare("SELECT id, first_name || ' ' || last_name as name FROM personnel ORDER BY first_name").all();
        
        // Also fetch models with category & brand details
        const models = db.prepare(`
            SELECT am.id, am.name, am.category_id, am.brand_id, ac.name as category_name, ab.name as brand_name
            FROM asset_models am
            JOIN asset_categories ac ON am.category_id = ac.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            ORDER BY am.name
        `).all();

        res.json({ categories, brands, statuses, companies, locations, personnel, models });
    } catch (err) {
        console.error('getMetadata error:', err);
        res.status(500).json({ error: 'Alt listeler yüklenemedi.' });
    }
};

// Create Categories, Brands, Models (Metadata helper)
exports.addCategory = (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Kategori adı gerekli.' });
        const info = db.prepare('INSERT INTO asset_categories (name) VALUES (?)').run(name);
        res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: 'Kategori eklenemedi (Zaten mevcut olabilir).' });
    }
};

exports.addBrand = (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Marka adı gerekli.' });
        const info = db.prepare('INSERT INTO asset_brands (name) VALUES (?)').run(name);
        res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: 'Marka eklenemedi (Zaten mevcut olabilir).' });
    }
};

exports.addModel = (req, res) => {
    try {
        const { name, category_id, brand_id } = req.body;
        if (!name || !category_id || !brand_id) return res.status(400).json({ error: 'Eksik parametreler.' });
        const info = db.prepare('INSERT INTO asset_models (name, category_id, brand_id) VALUES (?, ?, ?)').run(name, category_id, brand_id);
        res.json({ id: info.lastInsertRowid, name, category_id, brand_id });
    } catch (err) {
        res.status(500).json({ error: 'Model eklenemedi (Zaten mevcut olabilir).' });
    }
};

// Logs history for a single asset
exports.getAssetLogs = (req, res) => {
    try {
        const { id } = req.params;
        const logs = db.prepare(`
            SELECT 
                al.*,
                u.full_name as user_name,
                p.first_name || ' ' || p.last_name as personnel_target_name,
                l.name as location_target_name
            FROM asset_logs al
            LEFT JOIN users u ON al.created_by = u.id
            LEFT JOIN personnel p ON al.target_type = 'PERSONNEL' AND al.target_id = p.id
            LEFT JOIN locations l ON al.target_type = 'LOCATION' AND al.target_id = l.id
            WHERE al.asset_id = ?
            ORDER BY al.created_at DESC
        `).all(id);
        res.json(logs);
    } catch (err) {
        console.error('getAssetLogs error:', err);
        res.status(500).json({ error: 'İşlem logları yüklenemedi.' });
    }
};

// Get active and past asset assignments for a single personnel member
exports.getPersonnelAssets = (req, res) => {
    try {
        const { id } = req.params;

        // Active assets assigned to this personnel
        const active = db.prepare(`
            SELECT 
                a.id, a.serial_no, a.barcode, a.purchase_price, a.purchase_date,
                am.name as model_name, ab.name as brand_name, ac.name as category_name
            FROM assets a
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            JOIN asset_categories ac ON am.category_id = ac.id
            WHERE a.personnel_id = ?
        `).all(id);

        // Past assignments history retrieved from asset logs
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
            WHERE al.target_type = 'PERSONNEL' AND al.target_id = ?
            ORDER BY al.created_at DESC
        `).all(id);

        res.json({ active, history });
    } catch (err) {
        console.error('getPersonnelAssets error:', err);
        res.status(500).json({ error: 'Personel zimmet geçmişi yüklenemedi.' });
    }
};
