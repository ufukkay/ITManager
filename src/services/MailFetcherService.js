const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const { db } = require('../database/db');
const path = require('path');

function extractPeriod(filename, subject, emailDate) {
    const periodRegex = /(20\d{2})[-_\s]?(0[1-9]|1[0-2])/;
    let match = filename?.match(periodRegex);
    if (match) return `${match[1]}-${match[2]}`;
    
    match = subject?.match(periodRegex);
    if (match) return `${match[1]}-${match[2]}`;
    
    const date = emailDate ? new Date(emailDate) : new Date();
    return date.toISOString().slice(0, 7);
}

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

                            // Fatura Kontrol ve Otomatik Entegrasyon
                            const isPDF = fileName.toLowerCase().endsWith('.pdf');
                            const isXML = fileName.toLowerCase().endsWith('.xml');
                            const looksLikeInvoice = fileName.toLowerCase().includes('fatura') || 
                                                     fileName.toLowerCase().includes('invoice') || 
                                                     fileName.toLowerCase().includes('turkcell') || 
                                                     fileName.toLowerCase().includes('vodafone') || 
                                                     fileName.toLowerCase().includes('telekom') ||
                                                     subject.toLowerCase().includes('fatura') ||
                                                     subject.toLowerCase().includes('invoice');

                            if ((isPDF || isXML) && looksLikeInvoice) {
                                try {
                                    console.log(`Fatura eki algılandı, otomatik işleniyor: ${fileName}`);
                                    let operator = 'Bilinmeyen Operatör';
                                    const lowerName = fileName.toLowerCase();
                                    const lowerSubject = subject.toLowerCase();
                                    if (lowerName.includes('vodafone') || lowerSubject.includes('vodafone')) {
                                        operator = 'Vodafone';
                                    } else if (lowerName.includes('turkcell') || lowerSubject.includes('turkcell')) {
                                        operator = 'Turkcell';
                                    } else if (lowerName.includes('telekom') || lowerSubject.includes('telekom')) {
                                        operator = 'Türk Telekom';
                                    }

                                    const period = extractPeriod(fileName, subject, mail.date);
                                    let extractedRecords = [];

                                    if (isPDF) {
                                        const { parseInvoicePDF } = require('../modules/simcardtracking/services/invoiceParser');
                                        extractedRecords = await parseInvoicePDF(att.content);
                                    } else if (isXML) {
                                        const { parseInvoiceXML } = require('../modules/simcardtracking/services/ublParser');
                                        extractedRecords = await parseInvoiceXML(att.content);
                                    }

                                    if (extractedRecords && extractedRecords.length > 0) {
                                        const { findPersonnelByPhone } = require('../modules/simcardtracking/services/invoiceMatcher');
                                        const MasterDataService = require('../modules/core/service');

                                        db.transaction(() => {
                                            // Aynı dosyanın tekrar yüklenmesi durumunda önceki kayıtları temizle
                                            db.prepare('DELETE FROM invoices WHERE period = ? AND operator = ? AND source_file = ?')
                                              .run(period, operator, fileName);

                                            for (const rec of extractedRecords) {
                                                const match = findPersonnelByPhone(rec.phoneNo);

                                                MasterDataService.insertInvoiceRecord({
                                                    invoice_type: 'gsm',
                                                    operator: operator,
                                                    period: period,
                                                    phone_no: rec.phoneNo,
                                                    personnel_id: match.personnel_id,
                                                    company_id: match.company_id,
                                                    cost_center_id: match.cost_center_id,
                                                    source_file: fileName,
                                                    tariff: match.tariff || rec.tariff || '',
                                                    amount: rec.amount,
                                                    tax_kdv: rec.tax_kdv,
                                                    tax_oiv: rec.tax_oiv,
                                                    total_amount: rec.total_amount,
                                                    is_matched: match.isMatched ? 1 : 0
                                                });
                                            }
                                        })();
                                        console.log(`Fatura e-postası başarıyla aktarıldı: ${extractedRecords.length} kayıt, ${operator} / ${period}`);
                                    }
                                } catch (err) {
                                    console.error(`Fatura eki işleme hatası (${fileName}):`, err);
                                }
                            }
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
