const { db } = require('../../database/db');
const path = require('path');
const fs = require('fs');
const MailerService = require('../../services/MailerService');

exports.getMetadata = (req, res) => {
    try {
        let categories = db.prepare('SELECT * FROM helpdesk_categories').all();
        
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
            
            categories = db.prepare('SELECT * FROM helpdesk_categories').all();
        }

        const subcategories = db.prepare('SELECT * FROM helpdesk_subcategories').all();
        const departments = db.prepare('SELECT id, name FROM departments ORDER BY name').all();
        res.json({ categories, subcategories, departments });
    } catch (err) {
        console.error('getMetadata error:', err);
        res.status(500).json({ error: 'Kategori bilgileri alınamadı.' });
    }
};

exports.getMyTickets = (req, res) => {
    try {
        const userId = req.session.user.id;
        const tickets = db.prepare(`
            SELECT t.*, c.name as category_name, s.name as subcategory_name, u.full_name as assigned_name, d.name as related_dep_name
            FROM helpdesk_tickets t
            LEFT JOIN helpdesk_categories c ON t.category_id = c.id
            LEFT JOIN helpdesk_subcategories s ON t.subcategory_id = s.id
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN departments d ON t.related_dep_id = d.id
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
                   a.full_name as assigned_name,
                   d.name as related_dep_name
            FROM helpdesk_tickets t
            LEFT JOIN helpdesk_categories c ON t.category_id = c.id
            LEFT JOIN helpdesk_subcategories s ON t.subcategory_id = s.id
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            LEFT JOIN departments d ON t.related_dep_id = d.id
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
                   a.full_name as assigned_name, d.name as related_dep_name,
                   comp.name as user_company_name, dept.name as user_department_name
            FROM helpdesk_tickets t
            LEFT JOIN helpdesk_categories c ON t.category_id = c.id
            LEFT JOIN helpdesk_subcategories s ON t.subcategory_id = s.id
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            LEFT JOIN departments d ON t.related_dep_id = d.id
            LEFT JOIN personnel p ON u.personnel_id = p.id
            LEFT JOIN companies comp ON p.company_id = comp.id
            LEFT JOIN departments dept ON p.department_id = dept.id
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

        // Bilet seviyesindeki tüm dökümanları (ekleri) detaylı getir
        const allAttachments = db.prepare(`
            SELECT a.*, u.full_name as uploader_name
            FROM helpdesk_attachments a
            LEFT JOIN helpdesk_messages m ON a.message_id = m.id
            LEFT JOIN users u ON m.user_id = u.id
            WHERE a.ticket_id = ?
        `).all(id);

        // Eklerin boyutlarını diskten oku
        for (let att of allAttachments) {
            try {
                const fullPath = path.join(__dirname, '../../../', att.file_path);
                if (fs.existsSync(fullPath)) {
                    att.file_size = fs.statSync(fullPath).size;
                } else {
                    att.file_size = 0;
                }
            } catch (e) {
                att.file_size = 0;
            }
        }

        // Ortak çalışanları getir
        const collaborators = db.prepare(`
            SELECT u.id, u.full_name, u.email 
            FROM helpdesk_ticket_collaborators tc
            JOIN users u ON tc.user_id = u.id
            WHERE tc.ticket_id = ?
        `).all(id);

        // Aktif zaman sayacı
        let activeWorkLog = null;
        if (isAdminOrTech) {
            activeWorkLog = db.prepare(`
                SELECT * FROM helpdesk_work_logs 
                WHERE ticket_id = ? AND user_id = ? AND ended_at IS NULL 
                LIMIT 1
            `).get(id, userId);
        }

        const tasks = db.prepare(`
            SELECT t.*, u.full_name as assigned_name
            FROM helpdesk_tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.ticket_id = ?
            ORDER BY t.created_at ASC
        `).all(id);

        const checklist = db.prepare(`
            SELECT * FROM helpdesk_checklist
            WHERE ticket_id = ?
            ORDER BY id ASC
        `).all(id);

        const workLogs = db.prepare(`
            SELECT wl.*, u.full_name as user_name 
            FROM helpdesk_work_logs wl
            LEFT JOIN users u ON wl.user_id = u.id
            WHERE wl.ticket_id = ?
            ORDER BY wl.started_at DESC
        `).all(id);

        res.json({ ticket, messages, allAttachments, collaborators, activeWorkLog, tasks, checklist, workLogs });
    } catch (err) {
        console.error('getTicketDetails error:', err);
        res.status(500).json({ error: 'Talep detayı alınamadı.' });
    }
};

exports.createTicket = (req, res) => {
    try {
        const userId = req.session.user.id;
        const { category_id, subcategory_id, related_dep_id, ticket_type, title, description, priority } = req.body;
        
        // Generate ticket number
        const dt = new Date();
        const year = dt.getFullYear().toString().substr(-2);
        const rand = Math.floor(100000 + Math.random() * 900000); // 6 basamaklı bilet no
        const ticketNo = `TCK-${year}${rand}`;

        // Get personnel_id
        const pRow = db.prepare('SELECT personnel_id FROM users WHERE id = ?').get(userId);
        const personnelId = pRow ? pRow.personnel_id : null;

        // SLA hesaplama
        const slaDue = new Date();
        const pr = priority || 'Normal';
        if (pr === 'Yüksek') {
            slaDue.setHours(slaDue.getHours() + 4);
        } else if (pr === 'Düşük') {
            slaDue.setHours(slaDue.getHours() + 48);
        } else {
            slaDue.setHours(slaDue.getHours() + 24);
        }

        const result = db.prepare(`
            INSERT INTO helpdesk_tickets (ticket_no, user_id, personnel_id, category_id, subcategory_id, related_dep_id, ticket_type, title, description, priority, sla_due_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            ticketNo, userId, personnelId, category_id, subcategory_id, 
            related_dep_id || null, ticket_type || 'İş Talebi', 
            title, description, pr, slaDue.toISOString()
        );
        
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

exports.addMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;
        const senderName = req.session.user.full_name || 'Teknisyen';
        const { message, is_internal } = req.body;
        const isAdminOrTech = req.session.user.permissions.includes('helpdesk:manage');

        const internalFlag = (isAdminOrTech && is_internal === 'true') ? 1 : 0;

        const ticket = db.prepare(`
            SELECT t.*, u.email as user_email, u.full_name as user_name 
            FROM helpdesk_tickets t 
            LEFT JOIN users u ON t.user_id = u.id 
            WHERE t.id = ?
        `).get(id);
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
        
        db.prepare('UPDATE helpdesk_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

        // Kullanıcıya e-posta bildirimi gönder (Gizli not değilse ve mesajı yazan başkasıysa)
        if (internalFlag === 0 && ticket.user_email && userId !== ticket.user_id) {
            const mailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dadce0; border-radius: 8px;">
                <h2 style="color: #1a73e8; margin-bottom: 20px; font-size: 18px;">IT Destek Merkezi - Talep Güncellemesi</h2>
                <p>Merhaba <b>${ticket.user_name}</b>,</p>
                <p><b>${ticket.ticket_no}</b> numaralı talebinizle ilgili yeni bir mesaj eklenmiştir.</p>
                <div style="background-color: #f1f3f4; padding: 15px; border-left: 4px solid #1a73e8; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold; color: #202124;">${senderName}:</p>
                  <p style="margin: 10px 0 0 0; color: #5f6368; white-space: pre-wrap;">${message}</p>
                </div>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="http://localhost:5173/helpdesk/ticket/${id}" style="display:inline-block; padding: 10px 20px; background:#1a73e8; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Talebi Görüntüle</a>
                </div>
                <hr style="border: none; border-top: 1px solid #dadce0; margin: 20px 0;" />
                <p style="font-size: 11px; color: #9aa0a6; text-align: center;">
                  İpucu: Bu e-postaya doğrudan yanıt yazarak da talebinize mesaj ekleyebilirsiniz. Konudaki <b>${ticket.ticket_no}</b> kodunu değiştirmeyiniz.
                </p>
              </div>
            `;
            MailerService.sendMail(ticket.user_email, `[${ticket.ticket_no}] Yeni Mesaj: ${ticket.title}`, mailHtml).catch(err => {
                console.error('Mail notification failed:', err);
            });
        }

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
        
        db.prepare(`INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) VALUES (?, NULL, 'Talep teknisyen tarafından üzerine alındı.', 0)`).run(id);

        res.json({ message: 'Talep üzerinize alındı.' });
    } catch (err) {
        res.status(500).json({ error: 'Atama işlemi başarısız.' });
    }
};

exports.updateStatus = (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution_note } = req.body;
        
        let query = `UPDATE helpdesk_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP`;
        const params = [status];
        
        if (status === 'Çözüldü') {
            if (!resolution_note || resolution_note.trim() === '') {
                return res.status(400).json({ error: 'Talep çözülürken çözüm notu girilmesi zorunludur.' });
            }
            query += `, resolved_at = CURRENT_TIMESTAMP, resolution_note = ?`;
            params.push(resolution_note);
        } else if (status === 'Kapalı') {
            query += `, closed_at = CURRENT_TIMESTAMP`;
        }
        
        query += ` WHERE id = ?`;
        params.push(id);
        
        db.prepare(query).run(...params);
        
        const msgText = status === 'Çözüldü' 
            ? `Talep durumu güncellendi: Çözüldü. Çözüm Açıklaması: ${resolution_note}`
            : `Talep durumu güncellendi: ${status}`;
            
        db.prepare(`INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) VALUES (?, NULL, ?, 0)`).run(id, msgText);

        // Kullanıcıya çözüm maili gönder
        const ticket = db.prepare(`SELECT t.*, u.email as user_email, u.full_name as user_name FROM helpdesk_tickets t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = ?`).get(id);
        if (status === 'Çözüldü' && ticket && ticket.user_email) {
            const mailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dadce0; border-radius: 8px;">
                <h2 style="color: #34a853; margin-bottom: 20px; font-size: 18px;">IT Destek Merkezi - Talebiniz Çözüldü</h2>
                <p>Merhaba <b>${ticket.user_name}</b>,</p>
                <p><b>${ticket.ticket_no}</b> numaralı talebiniz başarıyla çözülmüştür.</p>
                <div style="background-color: #e6f4ea; padding: 15px; border-left: 4px solid #34a853; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold; color: #137333;">Çözüm Açıklaması:</p>
                  <p style="margin: 10px 0 0 0; color: #137333; white-space: pre-wrap;">${resolution_note}</p>
                </div>
                <p style="font-size: 12px; color: #5f6368;">
                  Eğer sorununuz devam ediyorsa, bu e-postaya yanıt vererek veya sistem üzerinden talebinizi tekrar açabilirsiniz.
                </p>
                <hr style="border: none; border-top: 1px solid #dadce0; margin: 20px 0;" />
                <p style="font-size: 11px; color: #9aa0a6; text-align: center;">
                  IT Manager Destek Ekibi
                </p>
              </div>
            `;
            MailerService.sendMail(ticket.user_email, `[${ticket.ticket_no}] Çözüldü: ${ticket.title}`, mailHtml).catch(err => {
                console.error('Mail resolution failed:', err);
            });
        }

        res.json({ message: 'Durum güncellendi.' });
    } catch (err) {
        console.error('updateStatus error:', err);
        res.status(500).json({ error: 'Durum güncellemesi başarısız.' });
    }
};

// --- EK DOSYA AKSİYONLARI ---

exports.emailAttachments = async (req, res) => {
    try {
        const { id } = req.params;
        const { attachmentIds } = req.body;
        const userEmail = req.session.user.email;
        const userName = req.session.user.full_name;

        if (!attachmentIds || attachmentIds.length === 0) {
            return res.status(400).json({ error: 'E-posta ile gönderilecek dosya seçilmedi.' });
        }

        const placeholders = attachmentIds.map(() => '?').join(',');
        const attachments = db.prepare(`
            SELECT * FROM helpdesk_attachments 
            WHERE ticket_id = ? AND id IN (${placeholders})
        `).all(id, ...attachmentIds);

        if (attachments.length === 0) {
            return res.status(404).json({ error: 'Gönderilecek döküman bulunamadı.' });
        }

        // Mailer transporter oluştur
        const transporter = MailerService.createTransporter();
        const smtpSettings = MailerService.getSmtpSettings();
        const fromEmail = smtpSettings.from_email || smtpSettings.user;

        // Dosyaları nodemailer formatına haritala
        const mailAttachments = attachments.map(att => {
            const absolutePath = path.join(__dirname, '../../../', att.file_path);
            return {
                filename: att.file_name,
                path: absolutePath
            };
        });

        const mailOptions = {
            from: `"IT Manager" <${fromEmail}>`,
            to: userEmail,
            subject: `Talep Ekleri: [${attachments.length} Dosya]`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dadce0; border-radius: 8px;">
                <h2 style="color: #1a73e8; margin-bottom: 20px; font-size: 18px;">Talep Ekleri Gönderimi</h2>
                <p>Merhaba <b>${userName}</b>,</p>
                <p>Sistem üzerinden talep ettiğiniz dökümanlar e-postanıza eklenerek gönderilmiştir.</p>
                <ul>
                  ${attachments.map(att => `<li>${att.file_name}</li>`).join('')}
                </ul>
                <hr style="border: none; border-top: 1px solid #dadce0; margin: 20px 0;" />
                <p style="font-size: 11px; color: #9aa0a6; text-align: center;">IT Manager</p>
              </div>
            `,
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Dökümanlar e-posta adresinize gönderildi.' });
    } catch (err) {
        console.error('emailAttachments error:', err);
        res.status(500).json({ error: 'E-posta gönderimi başarısız oldu.' });
    }
};

exports.deleteAttachment = (req, res) => {
    try {
        const { id, attachmentId } = req.params;

        const attachment = db.prepare('SELECT * FROM helpdesk_attachments WHERE ticket_id = ? AND id = ?').get(id, attachmentId);
        if (!attachment) {
            return res.status(404).json({ error: 'Dosya bulunamadı.' });
        }

        // Diskten sil
        const absolutePath = path.join(__dirname, '../../../', attachment.file_path);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }

        // DB'den sil
        db.prepare('DELETE FROM helpdesk_attachments WHERE id = ?').run(attachmentId);

        // Sistem mesajı ekle
        db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) 
            VALUES (?, NULL, 'Biletten dosya silindi: ' || ?, 0)
        `).run(id, attachment.file_name);

        res.json({ success: true, message: 'Dosya başarıyla silindi.' });
    } catch (err) {
        console.error('deleteAttachment error:', err);
        res.status(500).json({ error: 'Dosya silinirken hata oluştu.' });
    }
};

// --- ZAMAN TAKİBİ (START/STOP WORK) ---

exports.startWork = (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;

        const active = db.prepare(`
            SELECT id FROM helpdesk_work_logs 
            WHERE ticket_id = ? AND user_id = ? AND ended_at IS NULL
        `).get(id, userId);

        if (active) {
            return res.status(400).json({ error: 'Bu talep üzerinde zaten aktif bir zaman sayacınız bulunuyor.' });
        }

        db.prepare(`
            INSERT INTO helpdesk_work_logs (ticket_id, user_id, started_at) 
            VALUES (?, ?, ?)
        `).run(id, userId, new Date().toISOString());

        db.prepare(`
            UPDATE helpdesk_tickets 
            SET status = 'İşlemde', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(id);

        db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) 
            VALUES (?, NULL, 'Teknisyen çalışma zaman sayacını başlattı.', 0)
        `).run(id);

        res.json({ success: true, message: 'Çalışma zaman sayacı başlatıldı.' });
    } catch (err) {
        console.error('startWork error:', err);
        res.status(500).json({ error: 'Sayaç başlatılamadı.' });
    }
};

exports.stopWork = (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;

        const active = db.prepare(`
            SELECT * FROM helpdesk_work_logs 
            WHERE ticket_id = ? AND user_id = ? AND ended_at IS NULL
        `).get(id, userId);

        if (!active) {
            return res.status(400).json({ error: 'Aktif bir çalışma zaman sayacı bulunamadı.' });
        }

        const startedAt = new Date(active.started_at);
        const endedAt = new Date();
        const diffSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));

        db.prepare(`
            UPDATE helpdesk_work_logs 
            SET ended_at = ?, duration_seconds = ? 
            WHERE id = ?
        `).run(endedAt.toISOString(), diffSeconds, active.id);

        db.prepare(`
            UPDATE helpdesk_tickets 
            SET total_work_seconds = total_work_seconds + ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(diffSeconds, id);

        db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) 
            VALUES (?, NULL, 'Teknisyen çalışma zaman sayacını durdurdu. (Süre: ' || ? || ' saniye)', 0)
        `).run(id, diffSeconds);

        res.json({ success: true, message: 'Çalışma zaman sayacı durduruldu.', duration_seconds: diffSeconds });
    } catch (err) {
        console.error('stopWork error:', err);
        res.status(500).json({ error: 'Sayaç durdurulamadı.' });
    }
};

// --- ORTAK ÇALIŞAN TEKNİSYENLER (COLLABORATORS) ---

exports.getCollaborators = (req, res) => {
    try {
        const { id } = req.params;
        const list = db.prepare(`
            SELECT u.id, u.full_name, u.email 
            FROM helpdesk_ticket_collaborators tc
            JOIN users u ON tc.user_id = u.id
            WHERE tc.ticket_id = ?
        `).all(id);
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: 'Ortak çalışan listesi alınamadı.' });
    }
};

exports.addCollaborator = (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        db.prepare(`
            INSERT OR IGNORE INTO helpdesk_ticket_collaborators (ticket_id, user_id) 
            VALUES (?, ?)
        `).run(id, userId);

        const uRow = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
        const name = uRow ? uRow.full_name : 'Teknisyen';

        db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) 
            VALUES (?, NULL, 'Talebe ortak çalışan olarak dahil edildi: ' || ?, 0)
        `).run(id, name);

        res.json({ success: true, message: 'Ortak çalışan eklendi.' });
    } catch (err) {
        console.error('addCollaborator error:', err);
        res.status(500).json({ error: 'Ortak çalışan eklenemedi.' });
    }
};

exports.removeCollaborator = (req, res) => {
    try {
        const { id, userId } = req.params;

        db.prepare(`
            DELETE FROM helpdesk_ticket_collaborators 
            WHERE ticket_id = ? AND user_id = ?
        `).run(id, userId);

        const uRow = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
        const name = uRow ? uRow.full_name : 'Teknisyen';

        db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) 
            VALUES (?, NULL, 'Ortak çalışan talepten çıkarıldı: ' || ?, 0)
        `).run(id, name);

        res.json({ success: true, message: 'Ortak çalışan çıkarıldı.' });
    } catch (err) {
        console.error('removeCollaborator error:', err);
        res.status(500).json({ error: 'Ortak çalışan çıkarılamadı.' });
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

// --- GÖREVLER (TICKET SUB-TASKS) ---
exports.addTask = (req, res) => {
    try {
        const { id } = req.params;
        const { title, assigned_to } = req.body;
        const result = db.prepare(`
            INSERT INTO helpdesk_tasks (ticket_id, title, assigned_to) 
            VALUES (?, ?, ?)
        `).run(id, title, assigned_to || null);
        
        db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) 
            VALUES (?, NULL, 'Yeni bir görev oluşturuldu: ' || ?, 0)
        `).run(id, title);

        res.json({ success: true, message: 'Görev başarıyla eklendi.', taskId: result.lastInsertRowid });
    } catch (err) {
        console.error('addTask error:', err);
        res.status(500).json({ error: 'Görev eklenemedi.' });
    }
};

exports.toggleTask = (req, res) => {
    try {
        const { taskId } = req.params;
        const task = db.prepare('SELECT * FROM helpdesk_tasks WHERE id = ?').get(taskId);
        if (!task) return res.status(404).json({ error: 'Görev bulunamadı.' });

        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        const completedAt = newStatus === 'Completed' ? new Date().toISOString() : null;

        db.prepare('UPDATE helpdesk_tasks SET status = ?, completed_at = ? WHERE id = ?').run(newStatus, completedAt, taskId);
        
        const msgText = newStatus === 'Completed' ? 'tamamlandı' : 'tamamlanmadı olarak işaretlendi';
        db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) 
            VALUES (?, NULL, 'Görev ' || ? || ': ' || ?, 0)
        `).run(task.ticket_id, msgText, task.title);

        res.json({ success: true, message: 'Görev durumu güncellendi.', status: newStatus });
    } catch (err) {
        console.error('toggleTask error:', err);
        res.status(500).json({ error: 'Görev güncellenemedi.' });
    }
};

exports.deleteTask = (req, res) => {
    try {
        const { taskId } = req.params;
        const task = db.prepare('SELECT * FROM helpdesk_tasks WHERE id = ?').get(taskId);
        if (!task) return res.status(404).json({ error: 'Görev bulunamadı.' });

        db.prepare('DELETE FROM helpdesk_tasks WHERE id = ?').run(taskId);
        
        db.prepare(`
            INSERT INTO helpdesk_messages (ticket_id, user_id, message, is_internal) 
            VALUES (?, NULL, 'Görev silindi: ' || ?, 0)
        `).run(task.ticket_id, task.title);

        res.json({ success: true, message: 'Görev silindi.' });
    } catch (err) {
        console.error('deleteTask error:', err);
        res.status(500).json({ error: 'Görev silinemedi.' });
    }
};

// --- KONTROL LİSTESİ (CHECKLIST) ---
exports.addChecklistItem = (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const result = db.prepare(`
            INSERT INTO helpdesk_checklist (ticket_id, title) 
            VALUES (?, ?)
        `).run(id, title);

        res.json({ success: true, message: 'Kontrol listesi elemanı eklendi.', itemId: result.lastInsertRowid });
    } catch (err) {
        console.error('addChecklistItem error:', err);
        res.status(500).json({ error: 'Kontrol listesi elemanı eklenemedi.' });
    }
};

exports.toggleChecklistItem = (req, res) => {
    try {
        const { itemId } = req.params;
        const item = db.prepare('SELECT * FROM helpdesk_checklist WHERE id = ?').get(itemId);
        if (!item) return res.status(404).json({ error: 'Eleman bulunamadı.' });

        const newChecked = item.is_checked === 1 ? 0 : 1;
        db.prepare('UPDATE helpdesk_checklist SET is_checked = ? WHERE id = ?').run(newChecked, itemId);

        res.json({ success: true, message: 'Durum güncellendi.', is_checked: newChecked });
    } catch (err) {
        console.error('toggleChecklistItem error:', err);
        res.status(500).json({ error: 'Güncelleme başarısız.' });
    }
};

exports.deleteChecklistItem = (req, res) => {
    try {
        const { itemId } = req.params;
        db.prepare('DELETE FROM helpdesk_checklist WHERE id = ?').run(itemId);
        res.json({ success: true, message: 'Eleman silindi.' });
    } catch (err) {
        console.error('deleteChecklistItem error:', err);
        res.status(500).json({ error: 'Silme başarısız.' });
    }
};
