const express = require('express');
const router = express.Router();
const MasterDataController = require('./controller');
const { hasPermission } = require('../../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(hasPermission('masterdata:view'));

// Companies
router.get('/companies', MasterDataController.getCompanies);
router.post('/companies', hasPermission('masterdata:edit'), MasterDataController.createCompany);
router.put('/companies/:id', hasPermission('masterdata:edit'), MasterDataController.updateCompany);
router.delete('/companies/:id', hasPermission('masterdata:edit'), MasterDataController.deleteCompany);

// Departments
router.get('/departments', MasterDataController.getDepartments);
router.post('/departments', hasPermission('masterdata:edit'), MasterDataController.createDepartment);
router.put('/departments/:id', hasPermission('masterdata:edit'), MasterDataController.updateDepartment);
router.delete('/departments/:id', hasPermission('masterdata:edit'), MasterDataController.deleteDepartment);

// Cost Centers
router.get('/cost-centers', MasterDataController.getCostCenters);
router.post('/cost-centers', hasPermission('masterdata:edit'), MasterDataController.createCostCenter);
router.put('/cost-centers/:id', hasPermission('masterdata:edit'), MasterDataController.updateCostCenter);
router.delete('/cost-centers/:id', hasPermission('masterdata:edit'), MasterDataController.deleteCostCenter);

// Personnel
router.get('/personnel', MasterDataController.getPersonnel);
router.post('/personnel', hasPermission('masterdata:edit'), MasterDataController.createPersonnel);
router.put('/personnel/:id', hasPermission('masterdata:edit'), MasterDataController.updatePersonnel);
router.delete('/personnel/:id', hasPermission('masterdata:edit'), MasterDataController.deletePersonnel);
router.post('/personnel/bulk-delete', hasPermission('masterdata:edit'), MasterDataController.bulkDeletePersonnel);
router.post('/personnel/bulk-update', hasPermission('masterdata:edit'), MasterDataController.bulkUpdatePersonnel);

// Personnel Benefits (Aylık Destekler)
router.get('/personnel/:id/benefits', MasterDataController.getPersonnelBenefits);
router.post('/personnel/:id/benefits', hasPermission('masterdata:edit'), MasterDataController.createPersonnelBenefit);
router.put('/personnel/:id/benefits/:benefitId', hasPermission('masterdata:edit'), MasterDataController.updatePersonnelBenefit);
router.delete('/personnel/:id/benefits/:benefitId', hasPermission('masterdata:edit'), MasterDataController.deletePersonnelBenefit);

// Personnel User Accounts
router.get('/personnel/:id/user', MasterDataController.getPersonnelUser);
router.post('/personnel/:id/create-user', hasPermission('masterdata:edit'), MasterDataController.createPersonnelUser);

// Vehicles
router.get('/vehicles', MasterDataController.getVehicles);
router.post('/vehicles', hasPermission('masterdata:edit'), MasterDataController.createVehicle);
router.put('/vehicles/:id', hasPermission('masterdata:edit'), MasterDataController.updateVehicle);
router.delete('/vehicles/:id', hasPermission('masterdata:edit'), MasterDataController.deleteVehicle);

// Locations
router.get('/locations', MasterDataController.getLocations);
router.post('/locations', hasPermission('masterdata:edit'), MasterDataController.createLocation);
router.put('/locations/:id', hasPermission('masterdata:edit'), MasterDataController.updateLocation);
router.delete('/locations/:id', hasPermission('masterdata:edit'), MasterDataController.deleteLocation);

// Operators
router.get('/operators', MasterDataController.getOperators);
router.post('/operators', hasPermission('masterdata:edit'), MasterDataController.createOperator);
router.put('/operators/:id', hasPermission('masterdata:edit'), MasterDataController.updateOperator);
router.delete('/operators/:id', hasPermission('masterdata:edit'), MasterDataController.deleteOperator);

// Packages
router.get('/packages', MasterDataController.getPackages);
router.post('/packages', hasPermission('masterdata:edit'), MasterDataController.createPackage);
router.put('/packages/:id', hasPermission('masterdata:edit'), MasterDataController.updatePackage);
router.delete('/packages/:id', hasPermission('masterdata:edit'), MasterDataController.deletePackage);

// Licenses (M365 vb.)
router.get('/licenses', MasterDataController.getLicenses);
router.post('/licenses', hasPermission('masterdata:edit'), MasterDataController.createLicense);
router.put('/licenses/:id', hasPermission('masterdata:edit'), MasterDataController.updateLicense);
router.delete('/licenses/:id', hasPermission('masterdata:edit'), MasterDataController.deleteLicense);
router.get('/licenses/allocations', MasterDataController.getAllAllocations);

// Servers (Sunucu Envanteri)
router.get('/servers', MasterDataController.getServers);
router.post('/servers', hasPermission('masterdata:edit'), MasterDataController.createServer);
router.put('/servers/:id', hasPermission('masterdata:edit'), MasterDataController.updateServer);
router.delete('/servers/:id', hasPermission('masterdata:edit'), MasterDataController.deleteServer);

// Financial Reports
router.get('/reports/periods', MasterDataController.getAvailablePeriods);
router.get('/reports/financial/personnel/:id', MasterDataController.getPersonnelFinancialHistory);
router.get('/reports/financial/stats', MasterDataController.getFinancialStats);
router.get('/reports/personnel', MasterDataController.getReportByPersonnel);
router.get('/reports/service', MasterDataController.getReportByService);
router.get('/reports/company', MasterDataController.getReportByCompany);
router.get('/reports/personnel-benefits', MasterDataController.getPersonnelBenefitsReport);
router.post('/reports/financial/upload/m365', hasPermission('masterdata:edit'), upload.array('file'), MasterDataController.uploadM365Invoice);

// Audit Logs
router.get('/audit-logs', MasterDataController.getAuditLogs);
router.get('/audit-logs/:module/:id', MasterDataController.getResourceHistory);

// Impact Analysis
router.get('/:type/:id/impact', MasterDataController.getDeleteImpact);

module.exports = router;
