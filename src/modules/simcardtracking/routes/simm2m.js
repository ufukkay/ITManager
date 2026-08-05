const express = require('express');
const router = express.Router();
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');
const simAssetService = require('../services/simAssetService');

const TYPE = 'm2m';

// M2M hatları artık sadece Envanter üzerinden eklenir/düzenlenir (bkz. crud.controller.js
// SIM dispatch). Bu route dosyası salt-okunur listeleme + silme için kalıyor.

// GET /api/m2m - M2M hatlarını listele
router.get('/', (req, res) => {
  try {
    res.json(simAssetService.list(TYPE, req.query));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/m2m/:id
router.get('/:id', (req, res) => {
  const row = simAssetService.getById(TYPE, req.params.id);
  if (!row) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
  res.json(row);
});

// DELETE /api/m2m/:id
router.delete('/:id', hasPermission('sim:edit'), (req, res) => {
  const changes = simAssetService.remove(TYPE, req.params.id);
  if (changes === 0) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
  logActivity(req, 'DELETE', 'M2M', req.params.id);
  res.json({ message: 'M2M hattı silindi.' });
});

module.exports = router;
