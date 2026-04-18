const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');

const syncPersonnel = (fullName, department, company) => {
  if (!fullName) return;
  const nameParts = fullName.trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ') || fullName;

  try {
    const existing = db.prepare('SELECT id FROM personnel WHERE first_name = ? AND last_name = ?').get(firstName, lastName);
    if (!existing) {
      db.prepare('INSERT INTO personnel (first_name, last_name, department, company) VALUES (?, ?, ?, ?)').run(firstName, lastName, department || null, company || null);
    }
  } catch (e) {
    console.error('Error syncing personnel:', e);
  }
};

// GET /api/voice
router.get('/', (req, res) => {
  let query = `
    SELECT sim_voice.*, 
           p.name as package_name, 
           (pers.first_name || ' ' || pers.last_name) as personnel_name,
           comp.name as company_name,
           dept.name as department_name
    FROM sim_voice 
    LEFT JOIN packages p ON sim_voice.package_id = p.id 
    LEFT JOIN personnel pers ON sim_voice.personnel_id = pers.id
    LEFT JOIN companies comp ON sim_voice.company_id = comp.id
    LEFT JOIN departments dept ON sim_voice.department_id = dept.id
    WHERE 1=1
  `;
  const params = [];
  if (req.query.operator) { query += ' AND sim_voice.operator = ?'; params.push(req.query.operator); }
  if (req.query.status)   { query += ' AND sim_voice.status = ?';   params.push(req.query.status); }
  // You might want a filter by assigned_to or department as well, keep as is
  if (req.query.search) {
    query += ' AND (sim_voice.phone_no LIKE ? OR sim_voice.iccid LIKE ? OR pers.first_name LIKE ? OR pers.last_name LIKE ?)';
    const s = `%${req.query.search}%`;
    params.push(s, s, s, s);
  }
  query += ' ORDER BY sim_voice.id DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sim_voice WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
  res.json(row);
});

router.post('/', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const { iccid, phone_no, operator, status, personnel_id, company_id, department_id, notes, package_id } = req.body;
  if (!operator) return res.status(400).json({ message: 'Operatör zorunludur.' });

  // Duplicate check
  if (phone_no) {
    const exists = db.prepare(`
      SELECT 1 FROM sim_m2m   WHERE phone_no = ? UNION ALL
      SELECT 1 FROM sim_data  WHERE phone_no = ? UNION ALL
      SELECT 1 FROM sim_voice WHERE phone_no = ?
      LIMIT 1
    `).get(phone_no, phone_no, phone_no);
    if (exists) return res.status(400).json({ message: 'Bu telefon numarası zaten kayıtlı.' });
  }

  const result = db.prepare(`
    INSERT INTO sim_voice (iccid, phone_no, operator, status, personnel_id, company_id, department_id, notes, package_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(iccid || null, phone_no || null, operator, status || 'active',
         personnel_id || null, company_id || null, department_id || null, notes || null, package_id || null);
  
  logActivity(req, 'CREATE', 'VOICE', result.lastInsertRowid, { iccid, phone_no, personnel_id });
  res.status(201).json({ id: result.lastInsertRowid, message: 'Ses hattı eklendi.' });
});

router.put('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const { iccid, phone_no, operator, status, personnel_id, company_id, department_id, notes, package_id } = req.body;
  
  // Duplicate check
  if (phone_no) {
    const exists = db.prepare(`
      SELECT 1 FROM sim_m2m   WHERE phone_no = ? UNION ALL
      SELECT 1 FROM sim_data  WHERE phone_no = ? UNION ALL
      SELECT 1 FROM sim_voice WHERE phone_no = ? AND id != ?
      LIMIT 1
    `).get(phone_no, phone_no, phone_no, req.params.id);
    if (exists) return res.status(400).json({ message: 'Bu telefon numarası zaten kayıtlı.' });
  }

  const result = db.prepare(`
    UPDATE sim_voice 
    SET iccid=?, phone_no=?, operator=?, status=?, personnel_id=?, company_id=?, department_id=?, notes=?, package_id=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(iccid || null, phone_no || null, operator, status,
         personnel_id || null, company_id || null, department_id || null, notes || null, package_id || null, req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Kayıt bulunamadı.' });

  logActivity(req, 'UPDATE', 'VOICE', req.params.id, { iccid, phone_no, personnel_id });
  res.json({ message: 'Ses hattı güncellendi.' });
});

router.delete('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const result = db.prepare('DELETE FROM sim_voice WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
  
  logActivity(req, 'DELETE', 'VOICE', req.params.id);
  res.json({ message: 'Ses hattı silindi.' });
});

// POST /api/voice/bulk-delete
router.post('/bulk-delete', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Geçersiz ID listesi.' });
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM sim_voice WHERE id IN (${placeholders})`).run(...ids);
  
  logActivity(req, 'BULK_DELETE', 'VOICE', ids.join(','), { count: result.changes });
  ids.forEach(id => logActivity(req, 'DELETE', 'VOICE', id, { bulk: true }));
  res.json({ message: `${result.changes} kayıt başarıyla silindi.` });
});

// POST /api/voice/bulk-update
router.post('/bulk-update', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const { ids, data } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Geçersiz ID listesi.' });
  if (!data || Object.keys(data).length === 0) return res.status(400).json({ message: 'Güncellenecek veri bulunamadı.' });

  const fields = [];
  const params = [];
  const allowedFields = ['operator', 'status', 'personnel_id', 'company_id', 'department_id', 'notes', 'package_id'];
  Object.keys(data).forEach(key => {
    if (allowedFields.includes(key) && data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  });

  if (fields.length === 0) return res.status(400).json({ message: 'Güncellenecek geçerli alan bulunamadı.' });
  fields.push('updated_at = CURRENT_TIMESTAMP');
  const placeholders = ids.map(() => '?').join(',');
  const query = `UPDATE sim_voice SET ${fields.join(', ')} WHERE id IN (${placeholders})`;
  const result = db.prepare(query).run(...params, ...ids);
  
  logActivity(req, 'BULK_UPDATE', 'VOICE', ids.join(','), { count: result.changes, updates: data });
  ids.forEach(id => logActivity(req, 'UPDATE', 'VOICE', id, { ...data, bulk: true }));
  res.json({ message: `${result.changes} kayıt başarıyla güncellendi.` });
});

module.exports = router;
