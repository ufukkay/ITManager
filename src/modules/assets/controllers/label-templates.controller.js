const { db } = require('../../../database/db');

// --- THERMAL LABEL STUDIO ENDPOINTS ---

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
