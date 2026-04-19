const express = require('express');
const router = express.Router();
const { db } = require('../../../database/db');
const { hasPermission } = require('../../../middleware/auth');
const MailerService = require('../../../services/MailerService');

// Tüm talepleri getir
router.get('/', hasPermission('hr:view'), (req, res) => {
    try {
        const requests = db.prepare(`
            SELECT hr.*, 
                   c.name as company_name, 
                   d.name as department_name, 
                   l.name as location_name
            FROM hr_requests hr
            LEFT JOIN companies c ON hr.company_id = c.id
            LEFT JOIN departments d ON hr.department_id = d.id
            LEFT JOIN locations l ON hr.location_id = l.id
            ORDER BY hr.created_at DESC
        `).all();
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Yeni talep oluştur (IK tarafından)
router.post('/', hasPermission('hr:edit'), async (req, res) => {
    try {
        const { 
            type, full_name, position, request_date, 
            department_id, location_id, company_id, 
            equipment_needed, notes, manager_name, 
            email_groups, erp_permissions, file_permissions 
        } = req.body;
        
        if (!type || !full_name) {
            return res.status(400).json({ error: "Talep tipi ve isim zorunludur." });
        }

        const stmt = db.prepare(`
            INSERT INTO hr_requests (
                type, full_name, position, request_date, 
                department_id, location_id, company_id, 
                equipment_needed, notes, manager_name, 
                email_groups, erp_permissions, file_permissions
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(
            type, 
            full_name, 
            position || null, 
            request_date || null, 
            department_id || null, 
            location_id || null, 
            company_id || null, 
            JSON.stringify(equipment_needed || []), 
            notes || null,
            manager_name || null,
            email_groups || null,
            erp_permissions || null,
            file_permissions || null
        );

        try {
            await MailerService.sendHrNotification('admin@talay.com', req.body);
        } catch (mailErr) {
            console.error('Mail trigger failed:', mailErr);
        }

        res.status(201).json({ id: info.lastInsertRowid });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Talep güncelle (IT tarafından durum güncelleme veya IK tarafından düzenleme)
router.put('/:id', hasPermission('hr:edit'), (req, res) => {
    try {
        const { status, notes, equipment_needed } = req.body;
        const id = req.params.id;

        // Mevcut talebi getir (Personel ekleme kontrolü için)
        const request = db.prepare('SELECT * FROM hr_requests WHERE id = ?').get(id);
        if (!request) return res.status(404).json({ error: "Talep bulunamadı." });

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

        // --- MASTER DATA ENTEGRASYONU ---
        // Eğer talep "ENTRY" ise ve "COMPLETED" durumuna geçtiyse, personeli ortak tabloya ekle
        if (request.type === 'ENTRY' && status === 'COMPLETED') {
            const nameParts = request.full_name.trim().split(' ');
            const lastName = nameParts.length > 1 ? nameParts.pop() : '';
            const firstName = nameParts.join(' ') || request.full_name;

            // Personel var mı kontrol et
            const exists = db.prepare('SELECT id FROM personnel WHERE first_name = ? AND last_name = ?').get(firstName, lastName);
            if (!exists) {
                db.prepare(`
                    INSERT INTO personnel (first_name, last_name, company_id, department_id, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(firstName, lastName, request.company_id, request.department_id, 'active', `IK Talebi (${id}) ile oluşturuldu.`);
                console.log(`HR Talebi #${id} -> Personel oluşturuldu: ${request.full_name}`);
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Talep sil
router.delete('/:id', hasPermission('hr:edit'), (req, res) => {
    try {
        db.prepare('DELETE FROM hr_requests WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;

