const { db } = require('../database/db');
const MailerService = require('./MailerService');

// İşe girişinden 7 gün geçmiş olduğu halde sistemde fotoğrafı bulunmayan personel için,
// talebi açan kullanıcıya günde bir kez hatırlatma maili gönderir.
class PhotoReminderService {
    constructor() {
        this.timer = null;
        this.isRunning = false;
    }

    start() {
        if (this.timer) return;
        // Günde bir kez kontrol et
        this.timer = setInterval(() => this.sendReminders(), 24 * 60 * 60 * 1000);
        console.log('PhotoReminderService started.');
        this.sendReminders();
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        console.log('PhotoReminderService stopped.');
    }

    async sendReminders() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const candidates = db.prepare(`
                SELECT p.id, p.first_name, p.last_name, p.hire_date,
                       hr.created_by_email, hr.created_by_name
                FROM personnel p
                LEFT JOIN hr_requests hr ON p.source_hr_request_id = hr.id
                WHERE (p.photo_path IS NULL OR p.photo_path = '')
                  AND p.status = 'active'
                  AND p.hire_date IS NOT NULL
                  AND date(p.hire_date) <= date('now', '-7 days')
                  AND (p.last_photo_reminder_sent_at IS NULL OR date(p.last_photo_reminder_sent_at) < date('now'))
            `).all();

            if (candidates.length === 0) {
                this.isRunning = false;
                return;
            }

            console.log(`PhotoReminderService: ${candidates.length} personel için fotoğraf hatırlatması gönderiliyor.`);

            const markSent = db.prepare("UPDATE personnel SET last_photo_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?");

            for (const p of candidates) {
                const fullName = `${p.first_name} ${p.last_name}`;
                if (!p.created_by_email) {
                    // Talebi açan kişi bilinmiyorsa (eski/manuel oluşturulmuş kayıt) sadece işaretleyip geç
                    markSent.run(p.id);
                    continue;
                }

                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #dadce0; border-radius: 8px;">
                        <h3 style="color: #1a73e8;">Fotoğraf Yükleme Hatırlatması</h3>
                        <p><b>${fullName}</b> için sistemde henüz bir profil fotoğrafı bulunmuyor (işe giriş tarihinden bu yana bir haftadan fazla süre geçti).</p>
                        <p>Lütfen İK Bildirimleri ekranından ilgili talebi düzenleyip fotoğraf yükleyin.</p>
                    </div>
                `;

                try {
                    await MailerService.sendMail(p.created_by_email, `Fotoğraf Yükleme Hatırlatması - ${fullName}`, html);
                } catch (mailErr) {
                    console.error(`PhotoReminderService: ${fullName} için mail gönderilemedi:`, mailErr.message);
                }

                markSent.run(p.id);
            }
        } catch (err) {
            console.error('PhotoReminderService error:', err);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = new PhotoReminderService();
