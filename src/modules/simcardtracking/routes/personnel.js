const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');

router.get('/', (req, res) => {
  let q = `
    SELECT 
      p.*, 
      c.name as company_name,
      d.name as department_name
    FROM personnel p
    LEFT JOIN companies c ON p.company_id = c.id
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (req.query.search) {
    q += ' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR d.name LIKE ? OR c.name LIKE ?)';
    const s = `%${req.query.search}%`;
    params.push(s, s, s, s);
  }
  q += ' ORDER BY p.last_name, p.first_name';
  try {
    res.json(db.prepare(q).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT 
      p.*, 
      c.name as company_name,
      d.name as department_name
    FROM personnel p
    LEFT JOIN companies c ON p.company_id = c.id
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Personel bulunamadı.' });
  res.json(row);
});

router.post('/', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  console.log('[DEBUG] POST /api/personnel Body:', req.body);
  const { first_name, last_name, department_id, company_id, phone, notes } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ message: 'Ad ve soyad zorunludur.' });
  
  try {
    const stmt = db.prepare('INSERT INTO personnel (first_name, last_name, department_id, company_id, phone, notes) VALUES (?, ?, ?, ?, ?, ?)');
    const c_id = company_id ? parseInt(company_id) : null;
    const d_id = department_id ? parseInt(department_id) : null;
    
    console.log(`[DEBUG] Saving personnel with company_id=${c_id}, department_id=${d_id}`);
    const result = stmt.run(first_name, last_name, d_id, c_id, phone, notes);

    logActivity(req, 'CREATE', 'PERSONNEL', result.lastInsertRowid, { first_name, last_name });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Personel eklendi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  try {
    const fields = [];
    const params = [];
    const body = req.body;

    // Dynamically build the update query
    if (body.first_name !== undefined) { fields.push('first_name=?'); params.push(body.first_name); }
    if (body.last_name !== undefined) { fields.push('last_name=?'); params.push(body.last_name); }
    if (body.department_id !== undefined) { 
        fields.push('department_id=?'); 
        params.push(body.department_id ? parseInt(body.department_id) : null); 
    }
    if (body.company_id !== undefined) { 
        fields.push('company_id=?'); 
        params.push(body.company_id ? parseInt(body.company_id) : null); 
    }
    if (body.phone !== undefined) { fields.push('phone=?'); params.push(body.phone); }
    if (body.notes !== undefined) { fields.push('notes=?'); params.push(body.notes); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Güncellenecek alan bulunamadı.' });
    }

    params.push(req.params.id);
    const q = `UPDATE personnel SET ${fields.join(', ')} WHERE id=?`;
    const result = db.prepare(q).run(...params);
    
    if (result.changes === 0) return res.status(404).json({ message: 'Personel bulunamadı.' });

    logActivity(req, 'UPDATE', 'PERSONNEL', req.params.id, body);
    res.json({ message: 'Personel güncellendi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  try {
    const id = req.params.id;

    // Personelin herhangi bir ses hattına atanıp atanmadığını kontrol et
    const usage = db.prepare('SELECT COUNT(*) as count FROM sim_voice WHERE personnel_id = ?').get(id);
    
    if (usage && usage.count > 0) {
      const affected = db.prepare('SELECT phone_no FROM sim_voice WHERE personnel_id = ? LIMIT 3').all(id);
      const list = affected.map(a => a.phone_no).join(', ');
      return res.status(400).json({ 
        error: `Bu personel ${usage.count} hat üzerinde tanımlı. Önce hattan personeli kaldırın.\nEtkilenen hatlar: ${list}${usage.count > 3 ? '...' : ''}` 
      });
    }

    const result = db.prepare('DELETE FROM personnel WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ message: 'Personel bulunamadı.' });

    logActivity(req, 'DELETE', 'PERSONNEL', id);
    res.json({ message: 'Personel silindi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
