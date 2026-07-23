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
router.delete('/categories/:id', hasPermission('asset:edit'), assetController.deleteCategory);
router.post('/brands', hasPermission('asset:edit'), assetController.addBrand);
router.delete('/brands/:id', hasPermission('asset:edit'), assetController.deleteBrand);
router.post('/models', hasPermission('asset:edit'), assetController.addModel);
router.delete('/models/:id', hasPermission('asset:edit'), assetController.deleteModel);

// Statuses CRUD
router.post('/statuses', hasPermission('asset:edit'), assetController.addStatus);
router.put('/statuses/:id', hasPermission('asset:edit'), assetController.updateStatus);
router.delete('/statuses/:id', hasPermission('asset:edit'), assetController.deleteStatus);

// Financial Summaries & Structural Matrix
router.get('/financial-summary', assetController.getFinancialSummary);
router.get('/matrix-analytics', hasPermission('asset:view'), assetController.getMatrixAnalytics);

// Personnel asset assignment history
router.get('/personnel/:id', hasPermission('asset:view'), assetController.getPersonnelAssets);

// Logged-in user's assets
router.get('/my-assets', assetController.getMyAssets);

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

// Thermal Label Templates & Mobile QR Audit Routes
router.get('/label-templates', assetController.getLabelTemplates);
router.post('/label-templates', hasPermission('asset:edit'), assetController.saveLabelTemplate);
router.delete('/label-templates/:id', hasPermission('asset:edit'), assetController.deleteLabelTemplate);

// A4 Zimmet Form Templates Routes
router.get('/form-templates', assetController.getFormTemplates);
router.post('/form-templates', hasPermission('asset:edit'), assetController.saveFormTemplate);
router.delete('/form-templates/:id', hasPermission('asset:edit'), assetController.deleteFormTemplate);

router.get('/scan/:id', assetController.getAssetScanDetail);
router.post('/:id/audit', assetController.submitAssetAudit);

// Audit Session & Periodicity Compliance Routes
router.get('/audit/summary', assetController.getAuditSummary);
router.get('/audit/personnel-session/:personnelId', assetController.getPersonnelAuditSession);
router.post('/audit/personnel-submit', assetController.submitPersonnelAuditSession);
router.get('/audit/period-settings', assetController.getAuditPeriodSettings);
router.put('/audit/period-settings', hasPermission('asset:edit'), assetController.updateAuditPeriodSettings);

module.exports = router;
