const express = require('express');
const router = express.Router();
const { db } = require('../../../database/db');
const { hasPermission } = require('../../../middleware/auth');

// SIM hatları artık `assets` tablosunda (bkz. simAssetService.js), tip ayrımı model üzerinden.
const SIM_MODELS_SUBQUERY = `
  SELECT am.id FROM asset_models am
  JOIN asset_categories ac ON am.category_id = ac.id
  WHERE ac.name = 'SIM Kart'
`;
const TYPE_BY_MODEL = `CASE am.name WHEN 'M2M Hattı' THEN 'm2m' WHEN 'Data Hattı' THEN 'data' WHEN 'Ses Hattı' THEN 'voice' END`;

// GET /api/reports/summary - Genel özet istatistikler
router.get('/summary', (req, res) => {
  try {
    const totalLines = db.prepare(`SELECT COUNT(*) as total FROM assets WHERE model_id IN (${SIM_MODELS_SUBQUERY})`).get().total;
    const activeLines = db.prepare(`SELECT COUNT(*) as total FROM assets WHERE model_id IN (${SIM_MODELS_SUBQUERY}) AND line_status = 'Aktif'`).get().total;
    const passiveLines = db.prepare(`SELECT COUNT(*) as total FROM assets WHERE model_id IN (${SIM_MODELS_SUBQUERY}) AND line_status = 'Pasif'`).get().total;
    const cancelledLines = db.prepare(`SELECT COUNT(*) as total FROM assets WHERE model_id IN (${SIM_MODELS_SUBQUERY}) AND line_status = 'İptal'`).get().total;

    const operatorDist = db.prepare(`
      SELECT op.name as operator, COUNT(*) as count
      FROM assets a
      JOIN asset_models am ON a.model_id = am.id
      LEFT JOIN operators op ON a.operator_id = op.id
      WHERE am.id IN (${SIM_MODELS_SUBQUERY})
      GROUP BY op.name
    `).all().reduce((acc, row) => {
      acc[row.operator] = row.count;
      return acc;
    }, {});

    res.json({
      totalLines,
      activeLines,
      passiveLines,
      cancelledLines,
      operatorDist
    });
  } catch (error) {
    res.status(500).json({ message: 'Özet rapor oluşturulamadı', error: error.message });
  }
});

// POST /api/reports/advanced - Gelişmiş rapor oluştur
router.post('/advanced', (req, res) => {
  const { startDate, endDate, operator, status } = req.body;

  try {
    let query = `
      SELECT a.*, ${TYPE_BY_MODEL} as type, op.name as operator, a.line_status as status
      FROM assets a
      JOIN asset_models am ON a.model_id = am.id
      LEFT JOIN operators op ON a.operator_id = op.id
      WHERE am.id IN (${SIM_MODELS_SUBQUERY})
    `;
    const params = [];
    if (startDate) { query += ' AND a.created_at >= ?'; params.push(startDate + ' 00:00:00'); }
    if (endDate) { query += ' AND a.created_at <= ?'; params.push(endDate + ' 23:59:59'); }
    if (operator) { query += ' AND op.name = ?'; params.push(operator); }
    if (status) { query += ' AND a.line_status = ?'; params.push(status); }
    query += ' ORDER BY a.created_at DESC';

    const rows = db.prepare(query).all(...params);
    const m2mList = rows.filter(r => r.type === 'm2m');
    const dataList = rows.filter(r => r.type === 'data');
    const voiceList = rows.filter(r => r.type === 'voice');

    const groupBy = (list, field) => list.reduce((acc, r) => {
      const key = r[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const formatGroup = (obj) => Object.entries(obj).map(([k, v]) => ({ key: k, count: v }));

    const pkgRows = db.prepare(`
      SELECT p.id, p.name as package_name, p.type, o.name as operator_name,
             COUNT(a.id) as count
      FROM packages p
      LEFT JOIN operators o ON p.operator_id = o.id
      LEFT JOIN assets a ON a.package_id = p.id AND a.model_id IN (${SIM_MODELS_SUBQUERY})
      GROUP BY p.id
      HAVING count > 0
      ORDER BY count DESC, p.name ASC
    `).all();

    res.json({
      summary: {
        totals: { m2m: m2mList.length, data: dataList.length, voice: voiceList.length, all: rows.length },
        byOperator: { m2m: formatGroup(groupBy(m2mList, 'operator')), data: formatGroup(groupBy(dataList, 'operator')), voice: formatGroup(groupBy(voiceList, 'operator')) },
        byStatus: { m2m: formatGroup(groupBy(m2mList, 'status')), data: formatGroup(groupBy(dataList, 'status')), voice: formatGroup(groupBy(voiceList, 'status')) },
        byPackage: pkgRows
      },
      lists: { m2m: m2mList, data: dataList, voice: voiceList }
    });
  } catch (error) {
    res.status(500).json({ message: 'Gelişmiş rapor oluşturulamadı', error: error.message });
  }
});

module.exports = router;
