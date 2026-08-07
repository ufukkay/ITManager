const express = require('express');
const router = express.Router();
const monitoringController = require('./controller');
const { hasPermission } = require('../../middleware/auth');

// Agent metrik raporlama rotası (Uzak sunucu agent'ları için oturum korumasından muaf).
// AGENT_SHARED_SECRET .env'de tanımlıysa x-agent-secret header'ı zorunlu tutulur;
// tanımlı değilse (henüz yapılandırılmamış eski agent kurulumlarını kırmamak için)
// istek geçirilir ama bir uyarı loglanır.
router.post('/api/agent/report', monitoringController.verifyAgentSecret, monitoringController.reportAgentData);

router.use(hasPermission('monitoring:view'));

router.get('/api/servers', monitoringController.getServers);
router.post('/api/servers', hasPermission('monitoring:edit'), monitoringController.addServer);
router.delete('/api/server/:id', hasPermission('monitoring:edit'), monitoringController.deleteServer);
router.get('/api/server/:id', monitoringController.getServerDetail);

module.exports = router;

