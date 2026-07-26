const { db } = require('../../../database/db');

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
