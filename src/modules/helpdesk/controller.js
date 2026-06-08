const { db } = require('../../database/db');
const path = require('path');

exports.getMetadata = (req, res) => {
    try {
        let categories = db.prepare('SELECT * FROM helpdesk_categories').all();
        
        // Akılcı Çözüm: Eğer kategori hiç yoksa, otomatik olarak varsayılanları oluştur.
        if (categories.length === 0) {
            const cats = [
                { name: 'Donanım', type: 'Donanım', subs: ['Bilgisayar/Laptop', 'Yazıcı/Tarayıcı', 'Klavye/Mouse', 'Donanım Arızası', 'Diğer Donanım'] },
                { name: 'Yazılım', type: 'Yazılım', subs: ['İşletim Sistemi', 'M365 / Ofis', 'Uygulama Hatası', 'Lisans Talebi', 'Diğer Yazılım'] },
                { name: 'Ağ & İnternet', type: 'Ağ', subs: ['İnternet Kesintisi', 'Yavaşlık Problemi', 'VPN Bağlantısı', 'Wi-Fi Sorunu', 'Diğer Ağ'] },
                { name: 'Erişim & Hesap', type: 'Erişim', subs: ['Şifre Sıfırlama', 'Yeni E-Posta Talebi', 'Yetki İsteği', 'Diğer Erişim'] },
                { name: 'E-Posta', type: 'Yazılım', subs: ['Otomatik Bilet', 'Mail Gönderemiyorum', 'Mail Alamıyorum'] },
                { name: 'Diğer', type: 'Genel', subs: ['Bilgi Talebi', 'Öneri', 'Diğer'] }
            ];
            
            for (let c of cats) {
                const resCat = db.prepare('INSERT INTO helpdesk_categories (name, type) VALUES (?, ?)').run(c.name, c.type);
                const catId = resCat.lastInsertRowid;
                for (let s of c.subs) {
                    db.prepare('INSERT INTO helpdesk_subcategories (category_id, name) VALUES (?, ?)').run(catId, s);
                }
            }
            
            // Verileri yeniden çek
            categories = db.prepare('SELECT * FROM helpdesk_categories').all();
        }

        const subcategories = db.prepare('SELECT * FROM helpdesk_subcategories').all();
        res.json({ categories, subcategories });
    } catch (err) {
        console.error('getMetadata error:', err);
        res.status(500).json({ error: 'Kategori bilgileri alınamadı.' });
    }
};

exports.getMyTickets = (req, res) => {
    try {
        const userId = req.session.user.id;
        const tickets = db.prepare(`
            SELECT t.*, c.name as category_name, s.name as subcategory_name, u.full_name as assigned_name
            FROM helpdesk_tickets t
            LEFT JOIN helpdesk_categories c ON t.category_id = c.id
            LEFT JOIN helpdesk_subcategories s ON t.subcategory_id = s.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
        `).all(userId);
        res.json(tickets);
    } catch (err) {
        console.error('getMyTickets error:', err);
        res.status(500).json({ error: 'Talepleriniz alınamadı.' });
    }
};

exports.getTicketPool = (req, res) => {
    try {
        const tickets = db.prepare(`
            SELECT t.*, 
                   c.name as category_name, 
                   s.name as subcategory_name, 
                   u.full_name as user_name,
                   a.full_name as assigned_name
            FROM helpdesk_tickets t
            LEFT JOIN helpdesk_categories c ON t.category_id = c.id
            LEFT JOIN helpdesk_subcategories s ON t.subcategory_id = s.id
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            ORDER BY 
                CASE 
                    WHEN t.status = 'Açık' THEN 1
                    WHEN t.status = 'İşlemde' THEN 2
                    WHEN t.status = 'Beklemede' THEN 3
                    WHEN t.status = 'Çözüldü' THEN 4
                    ELSE 5
                END,
                t.created_at DESC
        `).all();
        res.json(tickets);
    } catch (err) {
        console.error('getTicketPool error:', err);
        res.status(500).json({ error: 'Talep havuzu alınamadı.' });
    }
};

exports.getTicketDetails = (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;
        const isAdminOrTech = req.session.user.permissions.includes('helpdesk:manage');

        const ticket = db.prepare(`
            SELECT t.*, c.name as category_name, s.name as subcategory_name, 
                   u.full_name as user_name, u.email as user_email,
                   a.full_name as assigned_name
            FROM helpdesk_tickets t
            LEFT JOIN helpdesk_categories c ON t.category_id = c.id
            LEFT JOIN helpdesk_subcategories s ON t.subcategory_id = s.id
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            WHERE t.id = ?
        `).get(id);

        if (!ticket) return res.status(404).json({ error: 'Talep bulunamadı.' });
        if (!isAdminOrTech && ticket.user_id !== userId) return res.status(403).json({ error: 'Yetkisiz erişim.' });

        const messagesQuery = isAdminOrTech 
            ? 'SELECT m.*, u.full_name as user_name FROM helpdesk_messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.ticket_id = ? ORDER BY m.created_at ASC'
            : 'SELECT m.*, u.full_name as user_name FROM helpdesk_messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.ticket_id = ? AND m.is_internal = 0 ORDER BY m.created_at ASC';
            
        const messages = db.prepare(messagesQuery).all(id);

        // Fetch attachments for messages
        for (let m of messages) {
            m.attachments = db.prepare('SELECT * FROM helpdesk_attachments WHERE message_id = ?').all(m.id);
        }

        res.json({ ticket, messages });
    } catch (err) {
        console.error('getTicketDetails error:', err);
        res.status(500).json({ error: 'Talep detayı alınamadı.' });
    }
};

exports.createTicket = (req, res) => {
    try {
        const userId = req.session.user.id;
        const { category_id, subcategory_id, title, description, priority } = req.body;
        
        // Generate ticket number
        const dt = new Date();
        const year = dt.getFullYear().toString().substr(-2);
        const rand = Math.floor(1000 + Math.random() * 9000);
        const ticketNo = `TCK-${year}${rand}`;

        // Get personnel_id
        const pRow = db.prepare('SELECT personnel_id FROM users WHERE id = ?').get(userId);
        const personnelId = pRow ? pRow.personnel_id : null;

        const result = db.prepare(`
            INSERT INTO helpdesk_tickets (ticket_no, user_id, personnel_id, category_id, subcategory_id, title, description, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(ticketNo, userId, personnelId, category_id, subcategory_id, title, description, priority || 'Normal');
        
        const ticketId = result.lastInsertRowid;

        // Create initial message
        const msgResult = db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message)
            VALUES (?, ?, ?)
        `).run(ticketId, userId, description);

        const messageId = msgResult.lastInsertRowid;

        if (req.files && req.files.length > 0) {
            const insertAtt = db.prepare('INSERT INTO helpdesk_attachments (ticket_id, message_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?)');
            for (let f of req.files) {
                insertAtt.run(ticketId, messageId, f.originalname, '/uploads/helpdesk/' + f.filename, f.mimetype);
            }
        }

        res.json({ message: 'Talep başarıyla oluşturuldu.', ticket_id: ticketId, ticket_no: ticketNo });
    } catch (err) {
        console.error('createTicket error:', err);
        res.status(500).json({ error: 'Talep oluşturulurken hata.' });
    }
};

exports.addMessage = (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;
        const { message, is_internal } = req.body;
        const isAdminOrTech = req.session.user.permissions.includes('helpdesk:manage');

        const internalFlag = (isAdminOrTech && is_internal === 'true') ? 1 : 0;

        const ticket = db.prepare('SELECT * FROM helpdesk_tickets WHERE id = ?').get(id);
        if (!ticket) return res.status(404).json({ error: 'Talep bulunamadı.' });
        if (!isAdminOrTech && ticket.user_id !== userId) return res.status(403).json({ error: 'Yetkisiz erişim.' });

        const result = db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal)
            VALUES (?, ?, ?, ?)
        `).run(id, userId, message, internalFlag);

        const messageId = result.lastInsertRowid;

        if (req.files && req.files.length > 0) {
            const insertAtt = db.prepare('INSERT INTO helpdesk_attachments (ticket_id, message_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?)');
            for (let f of req.files) {
                insertAtt.run(id, messageId, f.originalname, '/uploads/helpdesk/' + f.filename, f.mimetype);
            }
        }
        
        // Talebin güncellenme tarihini yenile
        db.prepare('UPDATE helpdesk_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

        res.json({ message: 'Mesaj eklendi.' });
    } catch (err) {
        console.error('addMessage error:', err);
        res.status(500).json({ error: 'Mesaj eklenirken hata oluştu.' });
    }
};

exports.assignTicket = (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;
        
        db.prepare(`UPDATE helpdesk_tickets SET assigned_to = ?, status = 'İşlemde', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(userId, id);
        
        // Sistem mesajı ekle
        db.prepare(`INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) VALUES (?, NULL, 'Talep teknisyen tarafından üzerine alındı.', 0)`).run(id);

        res.json({ message: 'Talep üzerinize alındı.' });
    } catch (err) {
        res.status(500).json({ error: 'Atama işlemi başarısız.' });
    }
};

exports.updateStatus = (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        let query = `UPDATE helpdesk_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP`;
        const params = [status];
        
        if (status === 'Çözüldü') {
            query += `, resolved_at = CURRENT_TIMESTAMP`;
        } else if (status === 'Kapalı') {
            query += `, closed_at = CURRENT_TIMESTAMP`;
        }
        
        query += ` WHERE id = ?`;
        params.push(id);
        
        db.prepare(query).run(...params);
        
        // Sistem mesajı
        db.prepare(`INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) VALUES (?, NULL, 'Talep durumu güncellendi: ' || ?, 0)`).run(id, status);

        res.json({ message: 'Durum güncellendi.' });
    } catch (err) {
        res.status(500).json({ error: 'Durum güncellemesi başarısız.' });
    }
};
// Ayarlar CRUD İşlemleri

exports.createCategory = (req, res) => {
    try {
        const { name, type } = req.body;
        db.prepare('INSERT INTO helpdesk_categories (name, type) VALUES (?, ?)').run(name, type || 'Genel');
        res.json({ success: true, message: 'Kategori eklendi.' });
    } catch (err) {
        console.error('createCat error', err);
        res.status(500).json({ error: 'Kategori eklenemedi.' });
    }
};

exports.updateCategory = (req, res) => {
    try {
        const { id } = req.params;
        const { name, type } = req.body;
        db.prepare('UPDATE helpdesk_categories SET name = ?, type = ? WHERE id = ?').run(name, type, id);
        res.json({ success: true, message: 'Kategori güncellendi.' });
    } catch (err) {
        res.status(500).json({ error: 'Kategori güncellenemedi.' });
    }
};

exports.deleteCategory = (req, res) => {
    try {
        const { id } = req.params;
        // Check if used
        const used = db.prepare('SELECT id FROM helpdesk_tickets WHERE category_id = ? LIMIT 1').get(id);
        if (used) return res.status(400).json({ error: 'Bu kategori kullanıldığı için silinemez.' });
        
        db.prepare('DELETE FROM helpdesk_categories WHERE id = ?').run(id);
        res.json({ success: true, message: 'Kategori silindi.' });
    } catch (err) {
        res.status(500).json({ error: 'Kategori silinemedi.' });
    }
};

exports.createSubcategory = (req, res) => {
    try {
        const { category_id, name } = req.body;
        db.prepare('INSERT INTO helpdesk_subcategories (category_id, name) VALUES (?, ?)').run(category_id, name);
        res.json({ success: true, message: 'Alt kategori eklendi.' });
    } catch (err) {
        console.error('createSubCat error', err);
        res.status(500).json({ error: 'Alt kategori eklenemedi.' });
    }
};

exports.updateSubcategory = (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        db.prepare('UPDATE helpdesk_subcategories SET name = ? WHERE id = ?').run(name, id);
        res.json({ success: true, message: 'Alt kategori güncellendi.' });
    } catch (err) {
        res.status(500).json({ error: 'Alt kategori güncellenemedi.' });
    }
};

exports.deleteSubcategory = (req, res) => {
    try {
        const { id } = req.params;
        const used = db.prepare('SELECT id FROM helpdesk_tickets WHERE subcategory_id = ? LIMIT 1').get(id);
        if (used) return res.status(400).json({ error: 'Bu alt kategori kullanıldığı için silinemez.' });
        
        db.prepare('DELETE FROM helpdesk_subcategories WHERE id = ?').run(id);
        res.json({ success: true, message: 'Alt kategori silindi.' });
    } catch (err) {
        res.status(500).json({ error: 'Alt kategori silinemedi.' });
    }
};
