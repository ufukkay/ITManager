const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM operators ORDER BY name').all());
});

router.post('/', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const { name } = req.body;
  console.log('[API] New Operator Request:', name);
  if (!name) return res.status(400).json({ message: 'Operatör adı zorunludur.' });
  
  try {
    const existing = db.prepare('SELECT id FROM operators WHERE name = ?').get(name);
    if (existing) {
      console.log('[API] Operator already exists:', name);
      return res.status(409).json({ message: 'Bu operatör zaten mevcut.' });
    }
    const result = db.prepare('INSERT INTO operators (name) VALUES (?)').run(name);
    console.log('[API] Operator inserted, ID:', result.lastInsertRowid);

    logActivity(req, 'CREATE', 'OPERATORS', result.lastInsertRowid, { name });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Operatör eklendi.' });
  } catch (err) {
    console.error('[API] Operator Error:', err);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

router.put('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Operatör adı zorunludur.' });
  
  try {
    const existing = db.prepare('SELECT id FROM operators WHERE name = ? AND id != ?').get(name, req.params.id);
    if (existing) return res.status(409).json({ message: 'Bu operatör adı zaten kullanımda.' });
    
    const result = db.prepare('UPDATE operators SET name = ? WHERE id = ?').run(name, req.params.id);
    if (result.changes === 0) return res.status(404).json({ message: 'Operatör bulunamadı.' });

    logActivity(req, 'UPDATE', 'OPERATORS', req.params.id, { name });
    res.json({ message: 'Operatör güncellendi.' });
  } catch (err) {
    console.error('[API] Operator Update Error:', err);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

router.delete('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const result = db.prepare('DELETE FROM operators WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Operatör bulunamadı.' });

  logActivity(req, 'DELETE', 'OPERATORS', req.params.id);
  res.json({ message: 'Operatör silindi.' });
});

module.exports = router;
