const express = require('express');
const router = express.Router();
const monitoringController = require('./controller');
const { hasPermission } = require('../../middleware/auth');

// Agent metrik raporlama rotası (Uzak sunucu agent'ları için oturum korumasından muaf)
router.post('/api/agent/report', monitoringController.reportAgentData);

router.use(hasPermission('monitoring:view'));

router.get('/api/servers', monitoringController.getServers);
router.post('/api/servers', hasPermission('monitoring:edit'), monitoringController.addServer);
router.delete('/api/server/:id', hasPermission('monitoring:edit'), monitoringController.deleteServer);
router.get('/api/server/:id', monitoringController.getServerDetail);

module.exports = router;

