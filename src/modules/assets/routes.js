const express = require('express');
const router = express.Router();
const assetController = require('./controller');
const { requireAuth, hasPermission } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer storage for Asset uploads (invoices, warranties)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../../uploads/assets');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// All asset routes are protected with login auth
router.use(requireAuth);

// Metadata & Help dropdown Lists
router.get('/metadata', assetController.getMetadata);
router.post('/categories', hasPermission('asset:edit'), assetController.addCategory);
router.post('/brands', hasPermission('asset:edit'), assetController.addBrand);
router.post('/models', hasPermission('asset:edit'), assetController.addModel);

// Financial Summaries
router.get('/financial-summary', assetController.getFinancialSummary);

// Personnel asset assignment history
router.get('/personnel/:id', hasPermission('asset:view'), assetController.getPersonnelAssets);

// CRUD routes with upload middleware for invoice and warranty documents
router.get('/', hasPermission('asset:view'), assetController.getAssets);
router.post('/', hasPermission('asset:edit'), upload.fields([
    { name: 'invoice', maxCount: 1 },
    { name: 'warranty', maxCount: 1 }
]), assetController.addAsset);

router.put('/:id', hasPermission('asset:edit'), upload.fields([
    { name: 'invoice', maxCount: 1 },
    { name: 'warranty', maxCount: 1 }
]), assetController.updateAsset);

router.delete('/:id', hasPermission('asset:edit'), assetController.deleteAsset);

// Log history for a single asset
router.get('/:id/logs', hasPermission('asset:view'), assetController.getAssetLogs);

// Checkout & Checkin
router.post('/:id/checkout', hasPermission('asset:edit'), assetController.checkoutAsset);
router.post('/:id/checkin', hasPermission('asset:edit'), assetController.checkinAsset);

module.exports = router;
