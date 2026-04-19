const express = require('express');
const router = express.Router();
const monitoringController = require('./controller');

// router.get('/', monitoringController.renderPage); // Removed EJS version
router.get('/api/servers', monitoringController.getServers);
router.post('/api/servers', monitoringController.addServer);
router.post('/api/agent/report', monitoringController.reportAgentData);
router.delete('/api/server/:id', monitoringController.deleteServer);
router.get('/api/server/:id', monitoringController.getServerDetail);

module.exports = router;

