const { db } = require('../../../database/db');

// Help-data configurations (Dropdown structures)
exports.getMetadata = (req, res) => {
    try {
        const categoriesRaw = db.prepare('SELECT * FROM asset_categories ORDER BY name').all();

        const categories = categoriesRaw.map(c => {
            let fields = [];
            if (c.custom_fields_json) {
                try { fields = JSON.parse(c.custom_fields_json); } catch (e) {}
            }
            return { ...c, custom_fields: fields };
        });

        const brands = db.prepare('SELECT * FROM asset_brands ORDER BY name').all();
        const statuses = db.prepare('SELECT * FROM asset_statuses ORDER BY name').all();
        const companies = db.prepare('SELECT id, name FROM companies ORDER BY name').all();
        const locations = db.prepare('SELECT id, name FROM locations ORDER BY name').all();
        const personnel = db.prepare("SELECT id, first_name || ' ' || last_name as name FROM personnel ORDER BY first_name").all();
        const vehicles = db.prepare("SELECT v.id, v.plate_no, v.vehicle_type, v.personnel_id, (p.first_name || ' ' || p.last_name) as personnel_name FROM vehicles v LEFT JOIN personnel p ON v.personnel_id = p.id ORDER BY v.plate_no").all();
        const departments = db.prepare('SELECT id, name FROM departments ORDER BY name').all();
        const costCenters = db.prepare('SELECT id, code, name FROM cost_centers ORDER BY name').all();
        const operators = db.prepare('SELECT id, name FROM operators ORDER BY name').all();
        const packages = db.prepare('SELECT id, name, type, operator_id, price, data_limit FROM packages ORDER BY name').all();

        const models = db.prepare(`
            SELECT am.id, am.name, am.category_id, am.brand_id, ac.name as category_name, ab.name as brand_name
            FROM asset_models am
            JOIN asset_categories ac ON am.category_id = ac.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            ORDER BY am.name
        `).all();

        res.json({ categories, brands, statuses, companies, locations, personnel, vehicles, departments, costCenters, operators, packages, models });
    } catch (err) {
        console.error('getMetadata error:', err);
        res.status(500).json({ error: 'Alt listeler yüklenemedi.' });
    }
};

// Update Category Custom Fields
exports.updateCategoryFields = (req, res) => {
    try {
        const { id } = req.params;
        const { custom_fields } = req.body;
        if (!Array.isArray(custom_fields)) {
            return res.status(400).json({ error: 'Geçersiz alan listesi.' });
        }
        const jsonStr = JSON.stringify(custom_fields.map(f => String(f).trim()).filter(Boolean));
        db.prepare('UPDATE asset_categories SET custom_fields_json = ? WHERE id = ?').run(jsonStr, id);
        res.json({ success: true, custom_fields });
    } catch (err) {
        console.error('updateCategoryFields error:', err);
        res.status(500).json({ error: 'Kategori alanları güncellenemedi.' });
    }
};

// Create & Delete Categories, Brands, Models, Statuses
exports.addCategory = (req, res) => {
    try {
        const { name, custom_fields } = req.body;
        if (!name) return res.status(400).json({ error: 'Kategori adı gerekli.' });
        const jsonStr = Array.isArray(custom_fields) ? JSON.stringify(custom_fields) : null;
        const info = db.prepare('INSERT INTO asset_categories (name, custom_fields_json) VALUES (?, ?)').run(name, jsonStr);
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
