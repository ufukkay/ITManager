const express = require('express');
const router = express.Router();
const { db } = require('../../../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');
const simAssetService = require('../services/simAssetService');

// GET /api/sim/search?q=...
router.get('/search', hasPermission('sim:view'), (req, res) => {
  const { q, active_only } = req.query;
  if (!q) return res.status(400).json({ message: 'Arama terimi gerekli.' });

  const queryTerm = `%${q}%`;
  const activeOnly = active_only === 'true' || active_only === '1';
  const activeClause = activeOnly ? " AND a.line_status = 'Aktif'" : '';

  try {
    const results = [];

    // Search M2M
    const m2m = db.prepare(`
      SELECT 'm2m' as type, a.*, a.line_status as status, v.plate_no
      FROM assets a
      JOIN asset_models am ON a.model_id = am.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      WHERE am.name = 'M2M Hattı' AND (a.phone_no LIKE ? OR a.serial_no LIKE ? OR v.plate_no LIKE ?)${activeClause}
    `).all(queryTerm, queryTerm, queryTerm);
    results.push(...m2m);

    // Search Data
    const data = db.prepare(`
      SELECT 'data' as type, a.*, a.line_status as status, l.name as location_name
      FROM assets a
      JOIN asset_models am ON a.model_id = am.id
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE am.name = 'Data Hattı' AND (a.phone_no LIKE ? OR a.serial_no LIKE ? OR l.name LIKE ?)${activeClause}
    `).all(queryTerm, queryTerm, queryTerm);
    results.push(...data);

    // Search Voice
    const voice = db.prepare(`
      SELECT 'voice' as type, a.*, a.line_status as status, (p.first_name || ' ' || p.last_name) as personnel_name
      FROM assets a
      JOIN asset_models am ON a.model_id = am.id
      LEFT JOIN personnel p ON a.personnel_id = p.id
      WHERE am.name = 'Ses Hattı' AND (a.phone_no LIKE ? OR a.serial_no LIKE ? OR (p.first_name || ' ' || p.last_name) LIKE ?)${activeClause}
    `).all(queryTerm, queryTerm, queryTerm);
    results.push(...voice);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hedef tipte anlamlı olan zimmet (owner) kolonları — bkz. simAssetService.buildOwnerFields
const TYPE_OWNER_FIELDS = {
  m2m: ['vehicle_id', 'personnel_id', 'department_id'],
  data: ['location_id', 'department_id'],
  voice: ['personnel_id', 'department_id'],
};
const OWNER_COLUMNS = ['personnel_id', 'location_id', 'vehicle_id', 'department_id'];

// POST /api/sim/transfer
// SIM hatları artık `assets` tablosunda aynı satır olduğu için "tip değiştirme" artık
// tablolar arası INSERT/DELETE değil, tek bir UPDATE (model_id + owner kolonları).
router.post('/transfer', hasPermission('sim:edit'), (req, res) => {
  const { id, currentType, targetType, targetData } = req.body;

  if (!id || !currentType || !targetType) {
    return res.status(400).json({ message: 'Eksik parametre: id, currentType ve targetType zorunludur.' });
  }

  if (currentType === targetType && !targetData) {
    return res.status(400).json({ message: 'Kaynak ve hedef tip aynı olamaz (Veri güncellemesi yoksa).' });
  }

  const validTypes = ['m2m', 'data', 'voice'];
  if (!validTypes.includes(currentType) || !validTypes.includes(targetType)) {
    return res.status(400).json({ message: 'Geçersiz hat tipi.' });
  }

  try {
    const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
    if (!row) throw new Error('Kaynak kayıt bulunamadı.');

    const owner = { personnel_id: null, location_id: null, vehicle_id: null, department_id: null };
    TYPE_OWNER_FIELDS[targetType].forEach(field => { owner[field] = row[field]; });
    if (targetData) {
      Object.keys(targetData).forEach(key => {
        if (OWNER_COLUMNS.includes(key)) owner[key] = targetData[key];
      });
    }

    const currentBrand = simAssetService.resolveBrandByModelId(row.model_id);
    const targetModelId = currentBrand
      ? simAssetService.resolveModelIdForBrandAndType(currentBrand.id, targetType)
      : null;
    if (!targetModelId) throw new Error(`Bu operatör markası altında "${targetType}" tipi tanımlı değil.`);

    db.prepare(`
      UPDATE assets SET model_id = ?, personnel_id = ?, location_id = ?, vehicle_id = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(targetModelId, owner.personnel_id, owner.location_id, owner.vehicle_id, owner.department_id, id);

    logActivity(req, 'TRANSFER', targetType.toUpperCase(), id, {
      fromType: currentType,
      toType: targetType,
      phone_no: row.phone_no,
      targetData
    });

    res.json({
      success: true,
      message: `SIM kart başarıyla ${currentType !== targetType ? targetType.toUpperCase() + ' hattına dönüştürüldü ve ' : ''}aktarıldı.`,
      newId: id
    });

  } catch (err) {
    console.error('Transfer Error:', err);
    res.status(500).json({ message: `Aktarım işlemi başarısız: ${err.message}` });
  }
});


module.exports = router;
