const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');

// Tüm paketleri getir (Operatör adıyla birlikte)
// authMiddleware zaten yukarda tanımlı, tüm giriş yapmış kullanıcılar paket listesini görebilir
router.get('/', (req, res) => {
  try {
    const packages = db.prepare(`
      SELECT p.*, o.name as operator_name 
      FROM packages p
      LEFT JOIN operators o ON p.operator_id = o.id
      ORDER BY p.name ASC
    `).all();
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni paket ekle
router.post('/', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  try {
    const { name, type, operator_id, price, data_limit, sms_limit, minutes_limit, features } = req.body;
    if (!name || !type || !operator_id) {
      return res.status(400).json({ error: "Paket adı, tipi ve operatörü zorunludur." });
    }
    const validTypes = ['m2m', 'data', 'voice']; // 'general' iptal edildi
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Geçersiz paket tipi. İzin verilenler: ${validTypes.join(', ')}` });
    }

    const stmt = db.prepare(`
      INSERT INTO packages (name, type, operator_id, price, data_limit, sms_limit, minutes_limit, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Fiyatı ondalıklı sayı (float) olarak al
    const parsedPrice = parseFloat(price) || 0;
    const pData = data_limit !== '' && data_limit != null ? parseFloat(data_limit) : null;
    const pSms = sms_limit !== '' && sms_limit != null ? parseInt(sms_limit, 10) : null;
    const pMin = minutes_limit !== '' && minutes_limit != null ? parseInt(minutes_limit, 10) : null;
    
    const info = stmt.run(name, type, operator_id, parsedPrice, pData, pSms, pMin, features || '');

    logActivity(req, 'CREATE', 'PACKAGES', info.lastInsertRowid, { name, type });
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Paket güncelle
router.put('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  try {
    const body = req.body;
    const fields = [];
    const params = [];

    if (body.name !== undefined) { fields.push('name = ?'); params.push(body.name); }
    if (body.type !== undefined) { 
        const validTypes = ['m2m', 'data', 'voice'];
        if (!validTypes.includes(body.type)) {
            return res.status(400).json({ error: `Geçersiz paket tipi: ${body.type}` });
        }
        fields.push('type = ?'); 
        params.push(body.type); 
    }
    if (body.operator_id !== undefined) { fields.push('operator_id = ?'); params.push(body.operator_id); }
    if (body.price !== undefined) { fields.push('price = ?'); params.push(parseFloat(body.price) || 0); }
    if (body.data_limit !== undefined) { fields.push('data_limit = ?'); params.push(body.data_limit !== '' && body.data_limit != null ? parseFloat(body.data_limit) : null); }
    if (body.sms_limit !== undefined) { fields.push('sms_limit = ?'); params.push(body.sms_limit !== '' && body.sms_limit != null ? parseInt(body.sms_limit, 10) : null); }
    if (body.minutes_limit !== undefined) { fields.push('minutes_limit = ?'); params.push(body.minutes_limit !== '' && body.minutes_limit != null ? parseInt(body.minutes_limit, 10) : null); }
    if (body.features !== undefined) { fields.push('features = ?'); params.push(body.features || ''); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "Güncellenecek alan bulunamadı." });
    }

    params.push(req.params.id);
    const q = `UPDATE packages SET ${fields.join(', ')} WHERE id = ?`;
    const result = db.prepare(q).run(...params);

    if (result.changes === 0) return res.status(404).json({ message: 'Paket bulunamadı.' });

    logActivity(req, 'UPDATE', 'PACKAGES', req.params.id, body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Paket sil
router.delete('/:id', hasPermission('SIM_TAKIP_EDIT'), (req, res) => {
  try {
    const id = req.params.id;
    
    // Paketin herhangi bir SIM hattı tarafından kullanılıp kullanılmadığını kontrol et
    const checkQuery = `
      SELECT (
        (SELECT COUNT(*) FROM sim_m2m WHERE package_id = ?) +
        (SELECT COUNT(*) FROM sim_data WHERE package_id = ?) +
        (SELECT COUNT(*) FROM sim_voice WHERE package_id = ?)
      ) as usageCount
    `;
    const usage = db.prepare(checkQuery).get(id, id, id);
    
    if (usage && usage.usageCount > 0) {
      // Etkilenen hatlardan ilk 3'ünü listele (kullanıcı bilgilendirmesi için)
      const affectedRows = [
        ...db.prepare(`SELECT COALESCE(phone_no, iccid, 'ID:'||id) as label FROM sim_m2m WHERE package_id = ? LIMIT 3`).all(id),
        ...db.prepare(`SELECT COALESCE(phone_no, iccid, 'ID:'||id) as label FROM sim_data WHERE package_id = ? LIMIT 3`).all(id),
        ...db.prepare(`SELECT COALESCE(phone_no, iccid, 'ID:'||id) as label FROM sim_voice WHERE package_id = ? LIMIT 3`).all(id),
      ].slice(0, 5).map(r => r.label);
      const moreCount = usage.usageCount - affectedRows.length;
      const listStr = affectedRows.join(', ') + (moreCount > 0 ? ` ve ${moreCount} hat daha` : '');
      return res.status(400).json({ error: `Bu paket ${usage.usageCount} hat tarafından kullanılıyor. Önce paketi kaldırın.\nEtkilenen hatlar: ${listStr}` });
    }

    db.prepare('DELETE FROM packages WHERE id = ?').run(id);

    logActivity(req, 'DELETE', 'PACKAGES', id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
