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

// Ayarlar (Sistem Yöneticisi)
router.post('/categories', hasPermission('system:settings'), helpdeskController.createCategory);
router.put('/categories/:id', hasPermission('system:settings'), helpdeskController.updateCategory);
router.delete('/categories/:id', hasPermission('system:settings'), helpdeskController.deleteCategory);

router.post('/subcategories', hasPermission('system:settings'), helpdeskController.createSubcategory);
router.put('/subcategories/:id', hasPermission('system:settings'), helpdeskController.updateSubcategory);
router.delete('/subcategories/:id', hasPermission('system:settings'), helpdeskController.deleteSubcategory);

module.exports = router;
