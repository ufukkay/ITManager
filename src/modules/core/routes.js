const express = require('express');
const router = express.Router();
const MasterDataController = require('./controller');

// Companies
router.get('/companies', MasterDataController.getCompanies);
router.post('/companies', MasterDataController.createCompany);
router.put('/companies/:id', MasterDataController.updateCompany);
router.delete('/companies/:id', MasterDataController.deleteCompany);

// Departments
router.get('/departments', MasterDataController.getDepartments);
router.post('/departments', MasterDataController.createDepartment);
router.put('/departments/:id', MasterDataController.updateDepartment);
router.delete('/departments/:id', MasterDataController.deleteDepartment);

// Cost Centers
router.get('/cost-centers', MasterDataController.getCostCenters);
router.post('/cost-centers', MasterDataController.createCostCenter);
router.put('/cost-centers/:id', MasterDataController.updateCostCenter);
router.delete('/cost-centers/:id', MasterDataController.deleteCostCenter);

// Personnel
router.get('/personnel', MasterDataController.getPersonnel);
router.post('/personnel', MasterDataController.createPersonnel);
router.put('/personnel/:id', MasterDataController.updatePersonnel);
router.delete('/personnel/:id', MasterDataController.deletePersonnel);

// Vehicles
router.get('/vehicles', MasterDataController.getVehicles);
router.post('/vehicles', MasterDataController.createVehicle);
router.put('/vehicles/:id', MasterDataController.updateVehicle);
router.delete('/vehicles/:id', MasterDataController.deleteVehicle);

// Locations
router.get('/locations', MasterDataController.getLocations);
router.post('/locations', MasterDataController.createLocation);
router.put('/locations/:id', MasterDataController.updateLocation);
router.delete('/locations/:id', MasterDataController.deleteLocation);

// Operators
router.get('/operators', MasterDataController.getOperators);
router.post('/operators', MasterDataController.createOperator);
router.put('/operators/:id', MasterDataController.updateOperator);
router.delete('/operators/:id', MasterDataController.deleteOperator);

// Packages
router.get('/packages', MasterDataController.getPackages);
router.post('/packages', MasterDataController.createPackage);
router.put('/packages/:id', MasterDataController.updatePackage);
router.delete('/packages/:id', MasterDataController.deletePackage);

// Licenses (M365 vb.)
router.get('/licenses', MasterDataController.getLicenses);
router.post('/licenses', MasterDataController.createLicense);
router.put('/licenses/:id', MasterDataController.updateLicense);
router.delete('/licenses/:id', MasterDataController.deleteLicense);

// Servers (Sunucu Envanteri)
router.get('/servers', MasterDataController.getServers);
router.post('/servers', MasterDataController.createServer);
router.put('/servers/:id', MasterDataController.updateServer);
router.delete('/servers/:id', MasterDataController.deleteServer);

module.exports = router;
