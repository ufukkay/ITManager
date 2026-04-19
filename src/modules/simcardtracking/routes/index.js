const express = require('express');
const router = express.Router();
const { hasPermission } = require('../../../middleware/auth');

// Module main page
// router.get('/', (req, res) => { ... }); // Removed EJS version

// API Routes
router.use('/api/m2m', require('./simm2m'));
router.use('/api/data', require('./simdata'));
router.use('/api/voice', require('./simvoice'));
router.use('/api/invoices', require('./invoices'));
router.use('/api/reports', require('./reports'));
router.use('/api/logs', require('./logs'));
router.use('/api/sim', require('./sim'));

module.exports = router;

