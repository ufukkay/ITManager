const express = require('express');
const router = express.Router();
const { db } = require('../../../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');
const fs = require('fs');
const path = require('path');

const logToFile = (msg) => {
  fs.appendFileSync(path.join(__dirname, '../../../../backend_log.txt'), `${new Date().toISOString()} - ${msg}\n`);
};

// Placeholder for syncLocation function, assuming it adds new locations to a separate table if they don't exist.
// This function is not provided in the original context, but is called in the requested changes.
const syncLocation = (location) => {
  if (location) {
    const existingLocation = db.prepare('SELECT id FROM locations WHERE name = ?').get(location);
    if (!existingLocation) {
      db.prepare('INSERT INTO locations (name) VALUES (?)').run(location);
    }
  }
};

// GET /api/data
router.get('/', (req, res) => {
  let query = `
    SELECT sim_data.*, p.name as package_name, l.name as location_name, c.name as company_name
    FROM sim_data 
    LEFT JOIN packages p ON sim_data.package_id = p.id 
    LEFT JOIN locations l ON sim_data.location_id = l.id
    LEFT JOIN companies c ON sim_data.company_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (req.query.operator) { query += ' AND sim_data.operator = ?'; params.push(req.query.operator); }
  if (req.query.status)   { query += ' AND sim_data.status = ?';   params.push(req.query.status); }
  if (req.query.location_id) { query += ' AND sim_data.location_id = ?'; params.push(req.query.location_id); }
  if (req.query.search) {
    query += ' AND (sim_data.phone_no LIKE ? OR sim_data.iccid LIKE ? OR l.name LIKE ?)';
    const s = `%${req.query.search}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY sim_data.id DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT sim_data.*, l.name as location_name, c.name as company_name
    FROM sim_data
    LEFT JOIN locations l ON sim_data.location_id = l.id
    LEFT JOIN companies c ON sim_data.company_id = c.id
    WHERE sim_data.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
  res.json(row);
});

// POST /api/data
router.post('/', hasPermission('sim:edit'), (req, res) => {
  const { iccid, phone_no, operator, status, location_id, company_id, notes, package_id } = req.body;
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

  console.log('[DEBUG] POST /sim-takip/api/data Body:', req.body);
  logToFile(`POST /api/data - Body: ${JSON.stringify(req.body)}`);
  try {
    const loc_id = location_id ? parseInt(location_id) : null;
    console.log('[DEBUG] Saving with location_id:', loc_id);
    logToFile(`Saving with loc_id: ${loc_id}`);
    const result = db.prepare(`
      INSERT INTO sim_data (iccid, phone_no, operator, status, location_id, company_id, notes, package_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(iccid || null, phone_no || null, operator, status || 'Aktif', 
           loc_id, company_id || null, notes || null, package_id || null);
    
    console.log('[DEBUG] Insert result:', result);
    logToFile(`Insert result: ${JSON.stringify(result)}`);
    logActivity(req, 'CREATE', 'DATA', result.lastInsertRowid, { iccid, phone_no, location_id: loc_id });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Data hattı eklendi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/data/:id
router.put('/:id', hasPermission('sim:edit'), (req, res) => {
  const { iccid, phone_no, operator, status, location_id, company_id, notes, package_id } = req.body;

  // Duplicate check
  if (phone_no) {
    const exists = db.prepare(`
      SELECT 1 FROM sim_m2m   WHERE phone_no = ? UNION ALL
      SELECT 1 FROM sim_data  WHERE phone_no = ? AND id != ? UNION ALL
      SELECT 1 FROM sim_voice WHERE phone_no = ?
      LIMIT 1
    `).get(phone_no, phone_no, req.params.id, phone_no);
    if (exists) return res.status(400).json({ message: 'Bu telefon numarası zaten kayıtlı.' });
  }

  console.log(`[DEBUG] PUT /sim-takip/api/data/${req.params.id} Body:`, req.body);
  logToFile(`PUT /api/data/${req.params.id} - Body: ${JSON.stringify(req.body)}`);
  try {
    const loc_id = location_id ? parseInt(location_id) : null;
    const comp_id = company_id ? parseInt(company_id) : null;
    const pkg_id = package_id ? parseInt(package_id) : null;

    const result = db.prepare(`
      UPDATE sim_data 
      SET iccid=?, phone_no=?, operator=?, status=?, location_id=?, company_id=?, notes=?, package_id=?,
      updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(iccid || null, phone_no || null, operator, status,
           loc_id, comp_id, notes || null, pkg_id, req.params.id);
    
    if (result.changes === 0) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
    
    logActivity(req, 'UPDATE', 'DATA', req.params.id, { iccid, phone_no, location_id: loc_id });
    res.json({ message: 'Data hattı güncellendi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', hasPermission('sim:edit'), (req, res) => {
  const result = db.prepare('DELETE FROM sim_data WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
  
  logActivity(req, 'DELETE', 'DATA', req.params.id);
  res.json({ message: 'Data hattı silindi.' });
});

// POST /api/data/bulk-delete
router.post('/bulk-delete', hasPermission('sim:edit'), (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Geçersiz ID listesi.' });
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM sim_data WHERE id IN (${placeholders})`).run(...ids);
  
  logActivity(req, 'BULK_DELETE', 'DATA', ids.join(','), { count: result.changes });
  ids.forEach(id => logActivity(req, 'DELETE', 'DATA', id, { bulk: true }));
  res.json({ message: `${result.changes} kayıt başarıyla silindi.` });
});

// POST /api/data/bulk-update
router.post('/bulk-update', hasPermission('sim:edit'), (req, res) => {
  const { ids, data } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Geçersiz ID listesi.' });
  if (!data || Object.keys(data).length === 0) return res.status(400).json({ message: 'Güncellenecek veri bulunamadı.' });

  const fields = [];
  const params = [];
  const allowedFields = ['operator', 'status', 'location_id', 'company_id', 'notes', 'package_id'];
  Object.keys(data).forEach(key => {
    if (allowedFields.includes(key) && data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  });

  if (fields.length === 0) return res.status(400).json({ message: 'Güncellenecek geçerli alan bulunamadı.' });
  fields.push('updated_at = CURRENT_TIMESTAMP');
  const placeholders = ids.map(() => '?').join(',');
  const query = `UPDATE sim_data SET ${fields.join(', ')} WHERE id IN (${placeholders})`;
  const result = db.prepare(query).run(...params, ...ids);
  
  logActivity(req, 'BULK_UPDATE', 'DATA', ids.join(','), { count: result.changes, updates: data });
  ids.forEach(id => logActivity(req, 'UPDATE', 'DATA', id, { ...data, bulk: true }));
  res.json({ message: `${result.changes} kayıt başarıyla güncellendi.` });
});

module.exports = router;

