const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');

router.get('/', (req, res) => {
  try {
    const departments = db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const { name, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'İsim zorunludur.' });
  
  try {
    const result = db.prepare('INSERT INTO departments (name, notes) VALUES (?, ?)')
      .run(name, notes);

    logActivity(req, 'CREATE', 'DEPARTMENT', result.lastInsertRowid, { name });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Departman eklendi.' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu departman zaten mevcut.' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const { name, notes } = req.body;
  try {
    const result = db.prepare('UPDATE departments SET name=?, notes=? WHERE id=?')
      .run(name, notes, req.params.id);
    
    if (result.changes === 0) return res.status(404).json({ message: 'Departman bulunamadı.' });

    logActivity(req, 'UPDATE', 'DEPARTMENT', req.params.id, { name });
    res.json({ message: 'Departman güncellendi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  const result = db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Departman bulunamadı.' });

  logActivity(req, 'DELETE', 'DEPARTMENT', req.params.id);
  res.json({ message: 'Departman silindi.' });
});

module.exports = router;
