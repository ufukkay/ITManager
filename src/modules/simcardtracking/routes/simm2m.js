const express = require('express');
const router = express.Router();
const { db } = require('../../../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');

// GET /api/m2m - M2M hatlarını listele
router.get('/', (req, res) => {
  let query = `
    SELECT 
      s.*, 
      p.name as package_name, p.price as cost_try, p.data_limit as quota_gb,
      v.plate_no, v.vehicle_type,
      c.name as company_name,
      pers.first_name || ' ' || pers.last_name as personnel_name,
      d.name as department_name
    FROM sim_m2m s
    LEFT JOIN packages p ON s.package_id = p.id 
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    LEFT JOIN companies c ON s.company_id = c.id
    LEFT JOIN personnel pers ON s.personnel_id = pers.id
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (req.query.operator)     { query += ' AND s.operator = ?';    params.push(req.query.operator); }
  if (req.query.status)       { query += ' AND s.status = ?';      params.push(req.query.status); }
  if (req.query.vehicle_type) { query += ' AND v.vehicle_type = ?';  params.push(req.query.vehicle_type); }
  if (req.query.search) {
    query += ' AND (v.plate_no LIKE ? OR s.phone_no LIKE ? OR s.iccid LIKE ? OR personnel_name LIKE ?)';
    const s = `%${req.query.search}%`;
    params.push(s, s, s, s);
  }
  query += ' ORDER BY s.id DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/m2m/:id - Belirli bir M2M hattını getir
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT s.*, v.plate_no, v.vehicle_type 
    FROM sim_m2m s
    LEFT JOIN vehicles v ON s.vehicle_id = v.id 
    WHERE s.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
  res.json(row);
});

// POST /api/m2m - Yeni M2M hattı ekle
router.post('/', hasPermission('sim:edit'), (req, res) => {
  const { iccid, phone_no, operator, status, vehicle_id, notes, package_id, company_id, personnel_id, department_id, last_usage_date } = req.body;
  if (!operator) return res.status(400).json({ message: 'Operatör zorunludur.' });
  if (!vehicle_id) return res.status(400).json({ message: 'Araç (Plaka) seçimi zorunludur.' });

  // Mükerrer kayıt kontrolü
  if (phone_no) {
    const exists = db.prepare(`
      SELECT 1 FROM sim_m2m   WHERE phone_no = ? UNION ALL
      SELECT 1 FROM sim_data  WHERE phone_no = ? UNION ALL
      SELECT 1 FROM sim_voice WHERE phone_no = ?
      LIMIT 1
    `).get(phone_no, phone_no, phone_no);
    if (exists) return res.status(400).json({ message: 'Bu telefon numarası zaten kayıtlı.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO sim_m2m (iccid, phone_no, operator, status, vehicle_id, notes, package_id, company_id, personnel_id, department_id, last_usage_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(iccid || null, phone_no || null, operator, status || 'active',
           vehicle_id, notes || null, package_id || null, company_id || null,
           personnel_id || null, department_id || null, last_usage_date || null);
    
    logActivity(req, 'CREATE', 'M2M', result.lastInsertRowid, { iccid, phone_no, vehicle_id });
    res.status(201).json({ id: result.lastInsertRowid, message: 'M2M hattı eklendi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/m2m/:id - M2M hattını güncelle
router.put('/:id', hasPermission('sim:edit'), (req, res) => {
  const { iccid, phone_no, operator, status, vehicle_id, notes, package_id, company_id, personnel_id, department_id, last_usage_date } = req.body;
  
  if (phone_no) {
    const exists = db.prepare(`
      SELECT 1 FROM sim_m2m   WHERE phone_no = ? AND id != ? UNION ALL
      SELECT 1 FROM sim_data  WHERE phone_no = ? UNION ALL
      SELECT 1 FROM sim_voice WHERE phone_no = ?
      LIMIT 1
    `).get(phone_no, req.params.id, phone_no, phone_no);
    if (exists) return res.status(400).json({ message: 'Bu telefon numarası zaten kayıtlı.' });
  }

  try {
    const result = db.prepare(`
      UPDATE sim_m2m
      SET iccid=?, phone_no=?, operator=?, status=?, vehicle_id=?, notes=?, package_id=?, 
          company_id=?, personnel_id=?, department_id=?, last_usage_date=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(iccid || null, phone_no || null, operator, status,
           vehicle_id || null, notes || null, package_id || null, 
           company_id || null, personnel_id || null, department_id || null, last_usage_date || null,
           req.params.id);
    
    if (result.changes === 0) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
    
    logActivity(req, 'UPDATE', 'M2M', req.params.id, { iccid, phone_no, vehicle_id });
    res.json({ message: 'M2M hattı güncellendi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/m2m/:id - M2M hattını sil
router.delete('/:id', hasPermission('sim:edit'), (req, res) => {
  const result = db.prepare('DELETE FROM sim_m2m WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
  
  logActivity(req, 'DELETE', 'M2M', req.params.id);
  res.json({ message: 'M2M hattı silindi.' });
});

// POST /api/m2m/bulk-delete - Toplu silme işlemi
router.post('/bulk-delete', hasPermission('sim:edit'), (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Geçersiz ID listesi.' });
  
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM sim_m2m WHERE id IN (${placeholders})`).run(...ids);
  
  logActivity(req, 'BULK_DELETE', 'M2M', ids.join(','), { count: result.changes });
  // İşlem geçmişi (timeline) için her birini ayrı ayrı kaydet
  ids.forEach(id => logActivity(req, 'DELETE', 'M2M', id, { bulk: true }));
  res.json({ message: `${result.changes} kayıt başarıyla silindi.` });
});

// POST /api/m2m/bulk-update - Toplu güncelleme işlemi
router.post('/bulk-update', hasPermission('sim:edit'), (req, res) => {
  const { ids, data } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Geçersiz ID listesi.' });
  if (!data || Object.keys(data).length === 0) return res.status(400).json({ message: 'Güncellenecek veri bulunamadı.' });

  const fields = [];
  const params = [];
  
  // Sadece izin verilen alanların güncellenmesini sağla
  const allowedFields = ['operator', 'status', 'vehicle_type', 'notes', 'package_id'];
  Object.keys(data).forEach(key => {
    if (allowedFields.includes(key) && data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  });

  if (fields.length === 0) return res.status(400).json({ message: 'Güncellenecek geçerli alan bulunamadı.' });

  fields.push('updated_at = CURRENT_TIMESTAMP');
  const placeholders = ids.map(() => '?').join(',');
  const query = `UPDATE sim_m2m SET ${fields.join(', ')} WHERE id IN (${placeholders})`;
  const result = db.prepare(query).run(...params, ...ids);
  
  logActivity(req, 'BULK_UPDATE', 'M2M', ids.join(','), { count: result.changes, updates: data });
  // İşlem geçmişi (timeline) için her birini ayrı ayrı kaydet
  ids.forEach(id => logActivity(req, 'UPDATE', 'M2M', id, { ...data, bulk: true }));
  res.json({ message: `${result.changes} kayıt başarıyla güncellendi.` });
});

module.exports = router;

