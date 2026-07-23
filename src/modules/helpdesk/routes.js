const express = require('express');
const router = express.Router();
const helpdeskController = require('./controller');
const { requireAuth, hasPermission } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../../uploads/helpdesk');
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

// Public Feedback (Email link target)
router.get('/tickets/:id/public-info', helpdeskController.getPublicTicketInfo);
router.post('/tickets/:id/feedback', helpdeskController.submitFeedback);

router.use(requireAuth);

// Metadata (Kategori ve Alt Kategoriler)
router.get('/metadata', helpdeskController.getMetadata);

// Kullanıcı işlemleri
router.get('/my-tickets', helpdeskController.getMyTickets);
router.post('/tickets', upload.array('attachments', 5), helpdeskController.createTicket);
router.get('/tickets/:id', helpdeskController.getTicketDetails);
router.post('/tickets/:id/messages', upload.array('attachments', 5), helpdeskController.addMessage);

// Teknisyen / Yönetim İşlemleri
router.get('/pool', hasPermission('helpdesk:manage'), helpdeskController.getTicketPool);
router.put('/tickets/:id/assign', hasPermission('helpdesk:manage'), helpdeskController.assignTicket);
router.put('/tickets/:id/status', hasPermission('helpdesk:manage'), helpdeskController.updateStatus);

// Zaman Takibi
router.post('/tickets/:id/work/start', hasPermission('helpdesk:manage'), helpdeskController.startWork);
router.post('/tickets/:id/work/stop', hasPermission('helpdesk:manage'), helpdeskController.stopWork);

// Ortak Çalışanlar (Co-assignment)
router.get('/tickets/:id/collaborators', hasPermission('helpdesk:manage'), helpdeskController.getCollaborators);
router.post('/tickets/:id/collaborators', hasPermission('helpdesk:manage'), helpdeskController.addCollaborator);
router.delete('/tickets/:id/collaborators/:userId', hasPermission('helpdesk:manage'), helpdeskController.removeCollaborator);

// Alt Görevler (Sub-tasks)
router.post('/tickets/:id/tasks', hasPermission('helpdesk:manage'), helpdeskController.addTask);
router.put('/tasks/:taskId/toggle', hasPermission('helpdesk:manage'), helpdeskController.toggleTask);
router.delete('/tasks/:taskId', hasPermission('helpdesk:manage'), helpdeskController.deleteTask);

// Kontrol Listesi (Checklist)
router.post('/tickets/:id/checklist', hasPermission('helpdesk:manage'), helpdeskController.addChecklistItem);
router.put('/checklist/:itemId/toggle', hasPermission('helpdesk:manage'), helpdeskController.toggleChecklistItem);
router.delete('/checklist/:itemId', hasPermission('helpdesk:manage'), helpdeskController.deleteChecklistItem);

// Ek Dosya İşlemleri
router.post('/tickets/:id/email-attachments', helpdeskController.emailAttachments);
router.delete('/tickets/:id/attachments/:attachmentId', helpdeskController.deleteAttachment);

// Ayarlar (Sistem Yöneticisi)
router.post('/categories', hasPermission('system:settings'), helpdeskController.createCategory);
router.put('/categories/:id', hasPermission('system:settings'), helpdeskController.updateCategory);
router.delete('/categories/:id', hasPermission('system:settings'), helpdeskController.deleteCategory);

router.post('/subcategories', hasPermission('system:settings'), helpdeskController.createSubcategory);
router.put('/subcategories/:id', hasPermission('system:settings'), helpdeskController.updateSubcategory);
router.delete('/subcategories/:id', hasPermission('system:settings'), helpdeskController.deleteSubcategory);

// CSAT Report (Technician and Admin dashboard)
router.get('/csat/report', hasPermission('helpdesk:manage'), helpdeskController.getCSATReport);

module.exports = router;
