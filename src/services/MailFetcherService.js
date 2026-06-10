const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const { db } = require('../database/db');

class MailFetcherService {
    constructor() {
        this.timer = null;
        this.isRunning = false;
    }

    start() {
        if (this.timer) return;
        // Check every 2 minutes
        this.timer = setInterval(() => this.fetchMails(), 2 * 60 * 1000);
        console.log('MailFetcherService started.');
        // Initial fetch
        this.fetchMails();
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        console.log('MailFetcherService stopped.');
    }

    async fetchMails() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const settings = db.prepare('SELECT * FROM imap_settings WHERE is_active = 1 LIMIT 1').get();
            if (!settings) {
                this.isRunning = false;
                return;
            }

            const config = {
                imap: {
                    user: settings.user,
                    password: settings.password,
                    host: settings.host,
                    port: settings.port,
                    tls: settings.tls === 1,
                    authTimeout: 10000,
                    tlsOptions: { rejectUnauthorized: false }
                }
            };

            const connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            // Sadece UNSEEN (okunmamış) mailleri getir
            const searchCriteria = ['UNSEEN'];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: true
            };

            const messages = await connection.search(searchCriteria, fetchOptions);

            if (messages.length > 0) {
                console.log(`Found ${messages.length} new emails. Processing...`);

                // E-Posta kategorisini bul veya oluştur
                let catRow = db.prepare("SELECT id FROM helpdesk_categories WHERE name = 'E-Posta'").get();
                if (!catRow) {
                    const res = db.prepare("INSERT INTO helpdesk_categories (name, type) VALUES ('E-Posta', 'Yazılım')").run();
                    catRow = { id: res.lastInsertRowid };
                }

                let subRow = db.prepare("SELECT id FROM helpdesk_subcategories WHERE category_id = ? AND name = 'Otomatik Bilet'").get(catRow.id);
                if (!subRow) {
                    const res = db.prepare("INSERT INTO helpdesk_subcategories (category_id, name) VALUES (?, 'Otomatik Bilet')").run(catRow.id);
                    subRow = { id: res.lastInsertRowid };
                }

                for (let item of messages) {
                    const all = item.parts.find(p => p.which === '');
                    const mail = await simpleParser(all.body);
                    
                    const fromEmail = mail.from.value[0].address;
                    const subject = mail.subject || 'Konusuz E-Posta Talebi';
                    const textContent = mail.text || 'İçerik bulunamadı.';

                    // Göndereni sistemde bul
                    const user = db.prepare('SELECT id, personnel_id FROM users WHERE email = ?').get(fromEmail);
                    const userId = user ? user.id : null;
                    const personnelId = user ? user.personnel_id : null;

                    // Talep Numarası Kontrolü (Konuda TCK-XXXX formatını ara)
                    const ticketNoMatch = subject.match(/(TCK-\d{6})/i);
                    let ticketId = null;
                    let isReply = false;

                    if (ticketNoMatch) {
                        const matchedNo = ticketNoMatch[1].toUpperCase();
                        const existingTicket = db.prepare('SELECT id FROM helpdesk_tickets WHERE ticket_no = ?').get(matchedNo);
                        if (existingTicket) {
                            ticketId = existingTicket.id;
                            isReply = true;
                        }
                    }

                    if (!isReply) {
                        // Yeni bilet oluştur
                        const dt = new Date();
                        const year = dt.getFullYear().toString().substr(-2);
                        const rand = Math.floor(100000 + Math.random() * 900000); // 6 basamaklı bilet no
                        const ticketNo = `TCK-${year}${rand}`;

                        // SLA Tarihi (Varsayılan Normal öncelik için +24 saat)
                        const slaDue = new Date();
                        slaDue.setHours(slaDue.getHours() + 24);

                        const result = db.prepare(`
                            INSERT INTO helpdesk_tickets (ticket_no, user_id, personnel_id, category_id, subcategory_id, title, description, priority, sla_due_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, 'Normal', ?)
                        `).run(ticketNo, userId, personnelId, catRow.id, subRow.id, subject, textContent, slaDue.toISOString());
                        
                        ticketId = result.lastInsertRowid;
                    } else {
                        // Mevcut talebi güncelle
                        db.prepare(`UPDATE helpdesk_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(ticketId);
                    }

                    // Mesaj oluştur
                    const msgResult = db.prepare(`
                        INSERT INTO helpdesk_messages (ticket_id, user_id, message)
                        VALUES (?, ?, ?)
                    `).run(ticketId, userId, textContent);
                    const messageId = msgResult.lastInsertRowid;

                    // Mail eklerini kaydet
                    if (mail.attachments && mail.attachments.length > 0) {
                        const fs = require('fs');
                        const dir = path.join(__dirname, '../../uploads/helpdesk');
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }
                        const insertAtt = db.prepare('INSERT INTO helpdesk_attachments (ticket_id, message_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?)');
                        for (let att of mail.attachments) {
                            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                            const fileName = att.filename || 'attachment';
                            const fileExt = path.extname(fileName);
                            const saveName = 'attachment-' + uniqueSuffix + fileExt;
                            const savePath = path.join(dir, saveName);
                            
                            fs.writeFileSync(savePath, att.content);
                            
                            insertAtt.run(ticketId, messageId, fileName, '/uploads/helpdesk/' + saveName, att.contentType);
                        }
                    }

                    // Eğer mailleri sil ayarı açıksa maili sunucudan sil
                    if (settings.delete_after_read === 1) {
                        await connection.addFlags(item.attributes.uid, ['\\Deleted']);
                    }
                }
            }

            connection.end();
        } catch (err) {
            console.error('MailFetcherService error:', err);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = new MailFetcherService();
