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
        const { serial_no, barcode, model_id, status_id, company_id, purchase_price, purchase_date, lifetime_months, notes, mac_address, ip_address, cpu_model, ram_gb, disk_gb, os_version, specs_json } = req.body;
        
        if (!serial_no || !model_id || !status_id || !company_id) {
            return res.status(400).json({ error: 'Lütfen zorunlu alanları (Seri No, Model, Durum, Şirket) doldurun.' });
        }

        const invoice_path = req.files && req.files.invoice ? '/uploads/assets/' + req.files.invoice[0].filename : null;
        const warranty_path = req.files && req.files.warranty ? '/uploads/assets/' + req.files.warranty[0].filename : null;
        const formattedSpecs = typeof specs_json === 'object' ? JSON.stringify(specs_json) : (specs_json || null);

        const info = db.prepare(`
            INSERT INTO assets (serial_no, barcode, model_id, status_id, company_id, purchase_price, purchase_date, lifetime_months, invoice_path, warranty_path, notes, mac_address, ip_address, cpu_model, ram_gb, disk_gb, os_version, specs_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            serial_no, barcode || null, model_id, status_id, company_id, purchase_price || 0, purchase_date || null, lifetime_months || 60, invoice_path, warranty_path, notes || null,
            mac_address || null, ip_address || null, cpu_model || null, ram_gb ? Number(ram_gb) : null, disk_gb ? Number(disk_gb) : null, os_version || null, formattedSpecs
        );

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes)
            VALUES (?, 'CREATE', 'NONE', 'Varlık oluşturuldu.')
        `).run(info.lastInsertRowid);

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

        const invoice_path = req.files && req.files.invoice ? '/uploads/assets/' + req.files.invoice[0].filename : currentAsset.invoice_path;
        const warranty_path = req.files && req.files.warranty ? '/uploads/assets/' + req.files.warranty[0].filename : currentAsset.warranty_path;
        const formattedSpecs = typeof specs_json === 'object' ? JSON.stringify(specs_json) : (specs_json || null);

        db.prepare(`
            UPDATE assets
            SET serial_no = ?, barcode = ?, model_id = ?, status_id = ?, company_id = ?, purchase_price = ?, purchase_date = ?, lifetime_months = ?, invoice_path = ?, warranty_path = ?, notes = ?, mac_address = ?, ip_address = ?, cpu_model = ?, ram_gb = ?, disk_gb = ?, os_version = ?, specs_json = ?
            WHERE id = ?
        `).run(
            serial_no, barcode || null, model_id, status_id, company_id, purchase_price || 0, purchase_date || null, lifetime_months || 60, invoice_path, warranty_path, notes || null,
            mac_address || null, ip_address || null, cpu_model || null, ram_gb ? Number(ram_gb) : null, disk_gb ? Number(disk_gb) : null, os_version || null, formattedSpecs,
            id
        );

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes)
            VALUES (?, 'UPDATE', 'NONE', 'Varlık bilgileri güncellendi.')
        `).run(id);

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
        db.prepare('DELETE FROM asset_logs WHERE asset_id = ?').run(id);
        db.prepare('DELETE FROM assets WHERE id = ?').run(id);
        res.json({ message: 'Varlık başarıyla silindi.' });
    } catch (err) {
        console.error('deleteAsset error:', err);
        res.status(500).json({ error: 'Varlık silinirken hata oluştu.' });
    }
};

// Checkout asset to personnel or location
exports.checkoutAsset = (req, res) => {
    try {
        const { id } = req.params;
        const { target_type, target_id, notes } = req.body;

        if (!target_type || !target_id) {
            return res.status(400).json({ error: 'Lütfen zimmet hedef türünü ve hedefini belirtin.' });
        }

        let personnel_id = null;
        let location_id = null;

        if (target_type === 'PERSONNEL') {
            personnel_id = target_id;
        } else if (target_type === 'LOCATION') {
            location_id = target_id;
        } else {
            return res.status(400).json({ error: 'Geçersiz zimmet türü.' });
        }

        const statusInUse = db.prepare("SELECT id FROM asset_statuses WHERE name LIKE '%Zimmet%' OR name LIKE '%Kullanım%' LIMIT 1").get();
        const statusId = statusInUse ? statusInUse.id : 2;

        db.prepare(`
            UPDATE assets 
            SET personnel_id = ?, location_id = ?, status_id = ?
            WHERE id = ?
        `).run(personnel_id, location_id, statusId, id);

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, target_id, notes)
            VALUES (?, 'CHECKOUT', ?, ?, ?)
        `).run(id, target_type, target_id, notes || 'Zimmetlendi.');

        res.json({ message: 'Varlık zimmetlendi.' });
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

        db.prepare(`
            UPDATE assets 
            SET personnel_id = NULL, location_id = NULL, status_id = ?
            WHERE id = ?
        `).run(finalStatusId, id);

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes)
            VALUES (?, 'CHECKIN', 'NONE', ?)
        `).run(id, notes || 'Depoya iade edildi.');

        res.json({ message: 'Varlık depoya iade edildi.' });
    } catch (err) {
        console.error('checkinAsset error:', err);
        res.status(500).json({ error: 'İade işlemi sırasında hata oluştu.' });
    }
};

// Financial Summary
exports.getFinancialSummary = (req, res) => {
    try {
        const assets = db.prepare('SELECT purchase_price, lifetime_months FROM assets').all();
        let totalValuation = 0;
        let totalMonthlyCost = 0;

        assets.forEach(a => {
            const price = parseFloat(a.purchase_price) || 0;
            totalValuation += price;
            if (a.lifetime_months && a.lifetime_months > 0) {
                totalMonthlyCost += price / a.lifetime_months;
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

// Personnel Assets
exports.getPersonnelAssets = (req, res) => {
    try {
        const { id } = req.params;

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
        res.status(500).json({ error: 'Personel zimmet bilgileri alınamadı.' });
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

// Create & Delete Categories, Brands, Models, Statuses
exports.addCategory = (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Kategori adı gerekli.' });
        const info = db.prepare('INSERT INTO asset_categories (name) VALUES (?)').run(name);
        res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: 'Kategori eklenemedi.' });
    }
};

exports.deleteCategory = (req, res) => {
    try {
        const { id } = req.params;
        const count = db.prepare('SELECT COUNT(*) as c FROM asset_models WHERE category_id = ?').get(id);
        if (count.c > 0) return res.status(400).json({ error: 'Bu kategoriye bağlı modeller bulunduğu için silinemez.' });
        db.prepare('DELETE FROM asset_categories WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Kategori silinemedi.' });
    }
};

exports.addBrand = (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Marka adı gerekli.' });
        const info = db.prepare('INSERT INTO asset_brands (name) VALUES (?)').run(name);
        res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: 'Marka eklenemedi.' });
    }
};

exports.deleteBrand = (req, res) => {
    try {
        const { id } = req.params;
        const count = db.prepare('SELECT COUNT(*) as c FROM asset_models WHERE brand_id = ?').get(id);
        if (count.c > 0) return res.status(400).json({ error: 'Bu markaya bağlı modeller bulunduğu için silinemez.' });
        db.prepare('DELETE FROM asset_brands WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Marka silinemedi.' });
    }
};

exports.addModel = (req, res) => {
    try {
        const { name, category_id, brand_id } = req.body;
        if (!name || !category_id || !brand_id) return res.status(400).json({ error: 'Eksik parametreler.' });
        const info = db.prepare('INSERT INTO asset_models (name, category_id, brand_id) VALUES (?, ?, ?)').run(name, category_id, brand_id);
        res.json({ id: info.lastInsertRowid, name, category_id, brand_id });
    } catch (err) {
        res.status(500).json({ error: 'Model eklenemedi.' });
    }
};

exports.deleteModel = (req, res) => {
    try {
        const { id } = req.params;
        const count = db.prepare('SELECT COUNT(*) as c FROM assets WHERE model_id = ?').get(id);
        if (count.c > 0) return res.status(400).json({ error: 'Bu modele bağlı envanterler bulunduğu için silinemez.' });
        db.prepare('DELETE FROM asset_models WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Model silinemedi.' });
    }
};

exports.addStatus = (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Durum adı gerekli.' });
        const info = db.prepare('INSERT INTO asset_statuses (name) VALUES (?)').run(name);
        res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: 'Durum eklenemedi.' });
    }
};

exports.updateStatus = (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Durum adı gerekli.' });
        db.prepare('UPDATE asset_statuses SET name = ? WHERE id = ?').run(name, id);
        res.json({ id: Number(id), name });
    } catch (err) {
        res.status(500).json({ error: 'Durum güncellenemedi.' });
    }
};

exports.deleteStatus = (req, res) => {
    try {
        const { id } = req.params;
        const count = db.prepare('SELECT COUNT(*) as c FROM assets WHERE status_id = ?').get(id);
        if (count.c > 0) return res.status(400).json({ error: 'Bu duruma atanmış envanterler bulunduğu için silinemez.' });
        db.prepare('DELETE FROM asset_statuses WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Durum silinemedi.' });
    }
};

// Logs history for single asset
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

// Matrix Analytics & Structural Envanter Haritası
exports.getMatrixAnalytics = (req, res) => {
    try {
        // 1. General Status Breakdown & Financials
        const totalAssets = db.prepare(`SELECT COUNT(*) as count, SUM(purchase_price) as totalValuation FROM assets`).get();
        
        const inUseAssets = db.prepare(`
            SELECT COUNT(*) as count, SUM(purchase_price) as totalValuation 
            FROM assets a 
            JOIN asset_statuses ast ON a.status_id = ast.id 
            WHERE (a.personnel_id IS NOT NULL OR a.location_id IS NOT NULL) 
               OR ast.name LIKE '%Zimmet%' OR ast.name LIKE '%Kullanım%'
        `).get();

        const inRepairAssets = db.prepare(`
            SELECT COUNT(*) as count, SUM(purchase_price) as totalValuation 
            FROM assets a 
            JOIN asset_statuses ast ON a.status_id = ast.id 
            WHERE ast.name LIKE '%Arıza%' OR ast.name LIKE '%Servis%' OR ast.name LIKE '%Tamir%'
        `).get();

        const scrappedAssets = db.prepare(`
            SELECT COUNT(*) as count, SUM(purchase_price) as totalValuation 
            FROM assets a 
            JOIN asset_statuses ast ON a.status_id = ast.id 
            WHERE ast.name LIKE '%Hurda%' OR ast.name LIKE '%Arşiv%'
        `).get();

        const warehouseCount = (totalAssets.count || 0) - (inUseAssets.count || 0) - (inRepairAssets.count || 0) - (scrappedAssets.count || 0);

        // 2. Category Breakdown
        const categoryBreakdown = db.prepare(`
            SELECT ac.id, ac.name, COUNT(a.id) as count, SUM(a.purchase_price) as total_value
            FROM asset_categories ac
            LEFT JOIN asset_models am ON am.category_id = ac.id
            LEFT JOIN assets a ON a.model_id = am.id
            GROUP BY ac.id, ac.name
            ORDER BY count DESC
        `).all();

        // 3. Location Breakdown Matrix
        const locationBreakdown = db.prepare(`
            SELECT 
                l.id, l.name, l.address,
                COUNT(a.id) as total_assets,
                SUM(CASE WHEN a.personnel_id IS NOT NULL OR a.location_id IS NOT NULL THEN 1 ELSE 0 END) as in_use_count,
                SUM(CASE WHEN ast.name LIKE '%Arıza%' OR ast.name LIKE '%Servis%' THEN 1 ELSE 0 END) as repair_count,
                SUM(a.purchase_price) as total_value
            FROM locations l
            LEFT JOIN assets a ON a.location_id = l.id
            LEFT JOIN asset_statuses ast ON a.status_id = ast.id
            GROUP BY l.id, l.name
            ORDER BY total_assets DESC
        `).all();

        // 4. Company & Department Assignment Matrix
        const companyBreakdown = db.prepare(`
            SELECT 
                c.id, c.name,
                COUNT(a.id) as total_assets,
                SUM(CASE WHEN a.personnel_id IS NOT NULL THEN 1 ELSE 0 END) as personnel_assigned_count,
                SUM(a.purchase_price) as total_value
            FROM companies c
            LEFT JOIN assets a ON a.company_id = c.id
            GROUP BY c.id, c.name
            ORDER BY total_assets DESC
        `).all();

        res.json({
            summary: {
                totalCount: totalAssets.count || 0,
                totalValuation: totalAssets.totalValuation || 0,
                inUseCount: inUseAssets.count || 0,
                inUseValuation: inUseAssets.totalValuation || 0,
                warehouseCount: warehouseCount < 0 ? 0 : warehouseCount,
                inRepairCount: inRepairAssets.count || 0,
                scrappedCount: scrappedAssets.count || 0
            },
            categories: categoryBreakdown,
            locations: locationBreakdown,
            companies: companyBreakdown
        });
    } catch (err) {
        console.error('getMatrixAnalytics error:', err);
        res.status(500).json({ error: 'Matris verileri alınamadı.' });
    }
};

// --- THERMAL LABEL STUDIO & MOBILE QR AUDIT ENDPOINTS ---

// Get all label templates
exports.getLabelTemplates = (req, res) => {
    try {
        const templates = db.prepare('SELECT * FROM label_templates ORDER BY is_default DESC, name ASC').all();
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: 'Etiket şablonları yüklenemedi.' });
    }
};

// Create or update a label template
exports.saveLabelTemplate = (req, res) => {
    try {
        const { id, name, width_mm, height_mm, config_json, is_default } = req.body;
        if (!name || !config_json) return res.status(400).json({ error: 'Şablon adı ve görsel düzen verisi gerekli.' });

        const jsonStr = typeof config_json === 'object' ? JSON.stringify(config_json) : config_json;

        if (is_default) {
            db.prepare('UPDATE label_templates SET is_default = 0').run();
        }

        if (id) {
            db.prepare('UPDATE label_templates SET name = ?, width_mm = ?, height_mm = ?, config_json = ?, is_default = ? WHERE id = ?')
              .run(name, width_mm || 70.0, height_mm || 35.0, jsonStr, is_default ? 1 : 0, id);
            res.json({ success: true, id: Number(id), name });
        } else {
            const info = db.prepare('INSERT INTO label_templates (name, width_mm, height_mm, config_json, is_default) VALUES (?, ?, ?, ?, ?)')
                           .run(name, width_mm || 70.0, height_mm || 35.0, jsonStr, is_default ? 1 : 0);
            res.json({ success: true, id: info.lastInsertRowid, name });
        }
    } catch (err) {
        console.error('saveLabelTemplate error:', err);
        res.status(500).json({ error: 'Şablon kaydedilemedi.' });
    }
};

// Delete label template
exports.deleteLabelTemplate = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM label_templates WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Şablon silinemedi.' });
    }
};

// Get Single Asset Info for Mobile Scan (Public/Authenticated)
exports.getAssetScanDetail = (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                a.*,
                am.name as model_name,
                ac.name as category_name,
                ab.name as brand_name,
                as_t.name as status_name,
                c.name as company_name,
                p.first_name || ' ' || p.last_name as personnel_name,
                p.email as personnel_email,
                l.name as location_name
            FROM assets a
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_categories ac ON am.category_id = ac.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            JOIN asset_statuses as_t ON a.status_id = as_t.id
            JOIN companies c ON a.company_id = c.id
            LEFT JOIN personnel p ON a.personnel_id = p.id
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE a.id = ? OR a.barcode = ? OR a.serial_no = ?
        `;
        const asset = db.prepare(query).get(id, id, id);
        if (!asset) {
            return res.status(404).json({ error: 'Envanter bulunamadı.' });
        }

        const audits = db.prepare('SELECT * FROM asset_audits WHERE asset_id = ? ORDER BY created_at DESC LIMIT 5').all(asset.id);
        res.json({ asset, audits });
    } catch (err) {
        console.error('getAssetScanDetail error:', err);
        res.status(500).json({ error: 'Mobil tarama detayı alınamadı.' });
    }
};

// Submit Mobile Asset Audit (Saha Sayımı Onayı)
exports.submitAssetAudit = (req, res) => {
    try {
        const { id } = req.params;
        const { notes, audited_by_name } = req.body;

        const asset = db.prepare('SELECT id, serial_no FROM assets WHERE id = ?').get(id);
        if (!asset) return res.status(404).json({ error: 'Varlık bulunamadı.' });

        const auditorName = audited_by_name || (req.session?.user?.full_name) || 'Mobil Saha Personeli';
        const auditorId = req.session?.user?.id || null;

        db.prepare('UPDATE assets SET last_audit_date = CURRENT_TIMESTAMP WHERE id = ?').run(id);

        db.prepare('INSERT INTO asset_audits (asset_id, audited_by, audited_by_name, notes) VALUES (?, ?, ?, ?)')
          .run(id, auditorId, auditorName, notes || 'Mobil QR Saha Sayımı Yapıldı - Zimmet Yerinde OK');

        db.prepare("INSERT INTO asset_logs (asset_id, action, target_type, notes) VALUES (?, 'AUDIT', 'NONE', ?)")
          .run(id, `Saha Sayımı Doğrulandı: ${auditorName}`);

        res.json({ success: true, message: 'Mobil QR Saha Sayımı başarıyla doğrulandı.' });
    } catch (err) {
        console.error('submitAssetAudit error:', err);
        res.status(500).json({ error: 'Saha sayımı işlenemedi.' });
    }
};

// Get Audit Summary & Periodicity Compliance Metrics
exports.getAuditSummary = (req, res) => {
    try {
        const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'audit_period_days'").get();
        const periodDays = setting ? Number(setting.value) : 90;

        const totalAssigned = db.prepare("SELECT COUNT(*) as c FROM assets WHERE personnel_id IS NOT NULL OR location_id IS NOT NULL").get().c;

        const auditedCount = db.prepare(`
            SELECT COUNT(*) as c 
            FROM assets 
            WHERE (personnel_id IS NOT NULL OR location_id IS NOT NULL)
              AND last_audit_date IS NOT NULL 
              AND last_audit_date >= datetime('now', '-' || ? || ' days')
        `).get(periodDays).c;

        const overdueCount = totalAssigned - auditedCount;

        // Personnel with overdue audits
        const overduePersonnelList = db.prepare(`
            SELECT DISTINCT p.id, p.first_name, p.last_name, p.title, c.name as company_name, d.name as department_name,
                   MAX(a.last_audit_date) as max_last_audit_date,
                   COUNT(a.id) as assigned_asset_count
            FROM personnel p
            JOIN assets a ON a.personnel_id = p.id
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN departments d ON p.department_id = d.id
            GROUP BY p.id
            HAVING max_last_audit_date IS NULL OR max_last_audit_date < datetime('now', '-' || ? || ' days')
        `).all(periodDays);

        res.json({
            periodDays,
            totalAssigned,
            auditedCount,
            overdueCount,
            overduePersonnelCount: overduePersonnelList.length,
            overduePersonnelList
        });
    } catch (err) {
        console.error('getAuditSummary error:', err);
        res.status(500).json({ error: 'Denetim özeti alınamadı.' });
    }
};

// Get Personnel Assets Audit Session
exports.getPersonnelAuditSession = (req, res) => {
    try {
        const { personnelId } = req.params;
        const person = db.prepare("SELECT p.*, c.name as company_name, d.name as department_name FROM personnel p LEFT JOIN companies c ON p.company_id = c.id LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?").get(personnelId);
        if (!person) return res.status(404).json({ error: 'Personel bulunamadı.' });

        const assets = db.prepare(`
            SELECT a.*, am.name as model_name, ab.name as brand_name, ac.name as category_name
            FROM assets a
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            JOIN asset_categories ac ON am.category_id = ac.id
            WHERE a.personnel_id = ?
        `).all(personnelId);

        res.json({ person, assets });
    } catch (err) {
        console.error('getPersonnelAuditSession error:', err);
        res.status(500).json({ error: 'Personel sayım verileri alınamadı.' });
    }
};

// Submit Personnel Batch Audit Session
exports.submitPersonnelAuditSession = (req, res) => {
    try {
        const { personnel_id, audited_asset_ids, notes } = req.body;
        if (!personnel_id || !Array.isArray(audited_asset_ids)) {
            return res.status(400).json({ error: 'Geçersiz sayım verisi.' });
        }

        const auditorName = (req.session?.user?.full_name) || 'Mobil Saha Teknisyeni';
        const auditorId = req.session?.user?.id || null;

        const updateAssetStmt = db.prepare("UPDATE assets SET last_audit_date = CURRENT_TIMESTAMP WHERE id = ?");
        const auditLogStmt = db.prepare("INSERT INTO asset_audits (asset_id, audited_by, audited_by_name, notes) VALUES (?, ?, ?, ?)");
        const actionLogStmt = db.prepare("INSERT INTO asset_logs (asset_id, action, target_type, notes) VALUES (?, 'AUDIT', 'NONE', ?)");

        audited_asset_ids.forEach(assetId => {
            updateAssetStmt.run(assetId);
            auditLogStmt.run(assetId, auditorId, auditorName, notes || 'Saha Personel Zimmet Sayımı Tamamlandı - Onaylandı');
            actionLogStmt.run(assetId, `Saha Zimmet Kontrolü Onaylandı: ${auditorName}`);
        });

        res.json({ success: true, message: `${audited_asset_ids.length} cihaz için zimmet sayımı tescillendi.` });
    } catch (err) {
        console.error('submitPersonnelAuditSession error:', err);
        res.status(500).json({ error: 'Saha zimmet sayımı kaydedilemedi.' });
    }
};

// Get & Update Audit Period Settings
exports.getAuditPeriodSettings = (req, res) => {
    try {
        const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'audit_period_days'").get();
        res.json({ audit_period_days: setting ? Number(setting.value) : 90 });
    } catch (err) {
        res.status(500).json({ error: 'Ayar yüklenemedi.' });
    }
};

exports.updateAuditPeriodSettings = (req, res) => {
    try {
        const { audit_period_days } = req.body;
        if (!audit_period_days || isNaN(audit_period_days)) {
            return res.status(400).json({ error: 'Geçerli bir gün sayısı yazınız.' });
        }
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('audit_period_days', ?)").run(String(audit_period_days));
        res.json({ success: true, audit_period_days: Number(audit_period_days) });
    } catch (err) {
        res.status(500).json({ error: 'Ayar güncellenemedi.' });
    }
};

// Zimmet Form Templates CRUD
exports.getFormTemplates = (req, res) => {
    try {
        const templates = db.prepare('SELECT * FROM zimmet_form_templates ORDER BY is_default DESC, id DESC').all();
        res.json(templates.map(t => ({
            ...t,
            elements: JSON.parse(t.elements_json || '[]')
        })));
    } catch (err) {
        console.error('getFormTemplates error:', err);
        res.status(500).json({ error: 'Form şablonları alınamadı.' });
    }
};

exports.saveFormTemplate = (req, res) => {
    try {
        const { id, name, elements, is_default } = req.body;
        if (!name || !elements) return res.status(400).json({ error: 'Şablon adı ve bileşen verileri gerekli.' });

        const jsonStr = typeof elements === 'object' ? JSON.stringify(elements) : elements;

        if (is_default) {
            db.prepare('UPDATE zimmet_form_templates SET is_default = 0').run();
        }

        if (id) {
            db.prepare('UPDATE zimmet_form_templates SET name = ?, elements_json = ?, is_default = ? WHERE id = ?')
              .run(name, jsonStr, is_default ? 1 : 0, id);
            res.json({ success: true, id: Number(id), name });
        } else {
            const info = db.prepare('INSERT INTO zimmet_form_templates (name, elements_json, is_default) VALUES (?, ?, ?)')
                           .run(name, jsonStr, is_default ? 1 : 0);
            res.json({ success: true, id: info.lastInsertRowid, name });
        }
    } catch (err) {
        console.error('saveFormTemplate error:', err);
        res.status(500).json({ error: 'Form şablonu kaydedilemedi.' });
    }
};

exports.deleteFormTemplate = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM zimmet_form_templates WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Form şablonu silinemedi.' });
    }
};

