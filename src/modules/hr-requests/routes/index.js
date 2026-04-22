const express = require('express');
const router = express.Router();
const { db } = require('../../../database/db');
const { hasPermission } = require('../../../middleware/auth');
const MailerService = require('../../../services/MailerService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/hr-photos';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Tüm talepleri getir
router.get('/', hasPermission('hr:view'), (req, res) => {
    try {
        const requests = db.prepare(`
            SELECT hr.*, 
                   COALESCE(hr.first_name || ' ' || hr.last_name, hr.full_name) as full_name,
                   c.name as company_name, 
                   d.name as department_name, 
                   l.name as location_name,
                   cc.name as cost_center_name
            FROM hr_requests hr
            LEFT JOIN companies c ON hr.company_id = c.id
            LEFT JOIN departments d ON hr.department_id = d.id
            LEFT JOIN locations l ON hr.location_id = l.id
            LEFT JOIN cost_centers cc ON hr.cost_center_id = cc.id
            ORDER BY hr.created_at DESC
        `).all();
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Yeni talep oluştur (IK tarafından)
router.post('/', hasPermission('hr:edit'), upload.single('photo'), async (req, res) => {
    try {
        const { 
            type, first_name, last_name, position_tr, position_en, request_date, 
            department_id, location_id, company_id, cost_center_id,
            equipment_needed, notes, manager_name, 
            email_groups, erp_permissions, file_permissions,
            email 
        } = req.body;
        
        const photo_path = req.file ? `/uploads/hr-photos/${req.file.filename}` : null;

        if (!type || !first_name || !last_name) {
            return res.status(400).json({ error: "Talep tipi ve ad-soyad zorunludur." });
        }

        const stmt = db.prepare(`
            INSERT INTO hr_requests (
                type, first_name, last_name, full_name, position_tr, position_en, position, request_date, 
                department_id, location_id, company_id, cost_center_id,
                equipment_needed, notes, manager_name, 
                email_groups, erp_permissions, file_permissions,
                photo_path, email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(
            type, 
            first_name, 
            last_name,
            `${first_name} ${last_name}`,
            position_tr || null,
            position_en || null,
            position_tr || position_en || null,
            request_date || null, 
            department_id || null, 
            location_id || null, 
            company_id || null, 
            cost_center_id || null,
            equipment_needed || '[]', 
            notes || null,
            manager_name || null,
            email_groups || null,
            erp_permissions || null,
            file_permissions || null,
            photo_path,
            email || null
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

// Talep güncelle (IT veya IK tarafından)
router.put('/:id', hasPermission('hr:edit'), upload.single('photo'), (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;

        // Mevcut talebi getir
        const request = db.prepare('SELECT * FROM hr_requests WHERE id = ?').get(id);
        if (!request) return res.status(404).json({ error: "Talep bulunamadı." });

        const updatableFields = [
            'type', 'first_name', 'last_name', 'position_tr', 'position_en', 'request_date', 
            'department_id', 'location_id', 'company_id', 'cost_center_id',
            'status', 'notes', 'manager_name', 
            'email_groups', 'erp_permissions', 'file_permissions', 'email'
        ];
        // position alanını da güncelle (geriye dönük uyumluluk için)
        if (body.position_tr) body.position = body.position_tr;

        const fields = [];
        const params = [];

        updatableFields.forEach(field => {
            if (body[field] !== undefined) {
                fields.push(`${field} = ?`);
                params.push(body[field]);
            }
        });

        // equipment_needed özel işlemi
        if (body.equipment_needed !== undefined) {
            fields.push('equipment_needed = ?');
            params.push(typeof body.equipment_needed === 'string' ? body.equipment_needed : JSON.stringify(body.equipment_needed || []));
        }

        // photo_path özel işlemi
        if (req.file) {
            fields.push('photo_path = ?');
            params.push(`/uploads/hr-photos/${req.file.filename}`);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: "Güncellenecek alan bulunamadı." });
        }

        params.push(id);
        const q = `UPDATE hr_requests SET ${fields.join(', ')} WHERE id = ?`;
        db.prepare(q).run(...params);

        // --- MASTER DATA ENTEGRASYONU ---
        // Eğer talep "ENTRY" ise ve "COMPLETED" durumuna geçtiyse, personeli ortak tabloya ekle
        if (request.type === 'ENTRY' && body.status === 'COMPLETED' && request.status !== 'COMPLETED') {
            const firstName = body.first_name || request.first_name;
            const lastName  = body.last_name || request.last_name;
            const titleTr   = body.position_tr || request.position_tr;
            const titleEn   = body.position_en || request.position_en;
            const companyId = body.company_id || request.company_id;
            const deptId    = body.department_id || request.department_id;
            const costCenterId = body.cost_center_id || request.cost_center_id;

            // Personel var mı kontrol et
            const exists = db.prepare('SELECT id FROM personnel WHERE first_name = ? AND last_name = ?').get(firstName, lastName);
            if (!exists) {
                db.prepare(`
                    INSERT INTO personnel (first_name, last_name, company_id, department_id, cost_center_id, status, notes, photo_path, email, title_tr, title_en, title)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(firstName, lastName, companyId, deptId, costCenterId, 'active', `IK Talebi (${id}) ile otomatik oluşturuldu.`, request.photo_path, body.email || request.email, titleTr, titleEn, titleTr);
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

