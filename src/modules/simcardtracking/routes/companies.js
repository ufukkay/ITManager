const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');

// Tüm şirketleri getir
router.get('/', (req, res) => {
  try {
    const companies = db.prepare('SELECT * FROM companies ORDER BY name ASC').all();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni şirket ekle
router.post('/', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  try {
    const { name, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Şirket adı zorunludur." });
    }

    const stmt = db.prepare('INSERT INTO companies (name, notes) VALUES (?, ?)');
    const info = stmt.run(name, notes || '');

    logActivity(req, 'CREATE', 'COMPANIES', info.lastInsertRowid, { name });
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Şirket güncelle
router.put('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  try {
    const { name, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Şirket adı zorunludur." });
    }

    const stmt = db.prepare('UPDATE companies SET name = ?, notes = ? WHERE id = ?');
    const result = stmt.run(name, notes || '', req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Şirket bulunamadı." });
    }

    logActivity(req, 'UPDATE', 'COMPANIES', req.params.id, { name });
    res.json({ success: true, message: 'Şirket güncellendi.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Şirket sil
router.delete('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  try {
    const id = req.params.id;
    
    // Şirketin kullanımda olup olmadığını kontrol et (Gelecekte company_id eklendiğinde)
    // Şu an sim_voice'da TEXT olarak duruyor ama biz ileride ID'ye geçeceğiz.
    
    db.prepare('DELETE FROM companies WHERE id = ?').run(id);

    logActivity(req, 'DELETE', 'COMPANIES', id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
