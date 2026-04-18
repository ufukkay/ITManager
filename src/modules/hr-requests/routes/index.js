const express = require('express');
const router = express.Router();
const { db } = require('../../../database/db');
const { hasPermission } = require('../../../middleware/auth');

// Tüm talepleri getir
router.get('/', hasPermission('HR_REQUESTS_VIEW'), (req, res) => {
    try {
        const requests = db.prepare('SELECT * FROM hr_requests ORDER BY created_at DESC').all();
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Yeni talep oluştur (IK tarafından)
router.post('/', hasPermission('HR_REQUESTS_EDIT'), (req, res) => {
    try {
        const { type, full_name, position, request_date, department, location, company, equipment_needed, notes } = req.body;
        
        if (!type || !full_name) {
            return res.status(400).json({ error: "Talep tipi ve isim zorunludur." });
        }

        const stmt = db.prepare(`
            INSERT INTO hr_requests (type, full_name, position, request_date, department, location, company, equipment_needed, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(
            type, 
            full_name, 
            position || null, 
            request_date || null, 
            department || null, 
            location || null, 
            company || null, 
            JSON.stringify(equipment_needed || []), 
            notes || null
        );

        res.status(201).json({ id: info.lastInsertRowid });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Talep güncelle (IT tarafından durum güncelleme veya IK tarafından düzenleme)
router.put('/:id', hasPermission('HR_REQUESTS_EDIT'), (req, res) => {
    try {
        const { status, notes, equipment_needed } = req.body;
        const id = req.params.id;

        const fields = [];
        const params = [];

        if (status !== undefined) { fields.push('status = ?'); params.push(status); }
        if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
        if (equipment_needed !== undefined) { fields.push('equipment_needed = ?'); params.push(JSON.stringify(equipment_needed)); }

        if (fields.length === 0) {
            return res.status(400).json({ error: "Güncellenecek alan bulunamadı." });
        }

        params.push(id);
        const q = `UPDATE hr_requests SET ${fields.join(', ')} WHERE id = ?`;
        db.prepare(q).run(...params);

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Talep sil
router.delete('/:id', hasPermission('HR_REQUESTS_EDIT'), (req, res) => {
    try {
        db.prepare('DELETE FROM hr_requests WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
