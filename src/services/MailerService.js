const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

class MailerService {
  /**
   * Returns SMTP settings from the database
   */
  static getSmtpSettings() {
    return db.prepare('SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1').get();
  }

  /**
   * Creates a Nodemailer transporter using dynamic DB settings
   */
  static createTransporter() {
    const settings = this.getSmtpSettings();
    if (!settings || !settings.host || !settings.user || !settings.pass) {
      throw new Error('SMTP ayarları eksik veya veritabanında bulunamadı.');
    }

    return nodemailer.createTransport({
      host: settings.host,
      port: settings.port || 587,
      secure: settings.secure === 1,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
    });
  }

  /**
   * Sends a password reset or welcome email with a reset link
   * @param {string} toEmail User's email address
   * @param {string} fullName User's full name
   * @param {boolean} isWelcome If true, sends welcome message. Otherwise, sends reset message.
   */
  static async sendPasswordResetEmail(toEmail, fullName, isWelcome = false) {
    try {
      const transporter = this.createTransporter();
      const settings = this.getSmtpSettings();
      const fromEmail = settings.from_email || settings.user;

      const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'itmanager-dev-secret';
      const token = jwt.sign({ email: toEmail }, secret, { expiresIn: '2h' });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

      const subject = isWelcome 
          ? 'IT Manager - Hesabınız Oluşturuldu: Parola Belirleyin'
          : 'IT Manager - Parola Sıfırlama Talebi';

      const messageHtml = isWelcome
          ? `<p>Merhaba <b>${fullName}</b>,</p>
             <p>IT Manager sisteminde hesabınız oluşturuldu. Güvenliğiniz için doğrudan bir parola ataması yapılmamıştır. Lütfen sisteme giriş yapabilmek için aşağıdaki bağlantıdan parolanızı belirleyin.</p>`
          : `<p>Merhaba <b>${fullName}</b>,</p>
             <p>IT Manager sistemindeki hesabınız için parola sıfırlama talebi aldık. Yeni bir parola belirlemek için aşağıdaki bağlantıya tıklayın. Bu talebi siz yapmadıysanız bu mesajı dikkate almayınız.</p>`;

      const mailOptions = {
        from: `"IT Manager" <${fromEmail}>`,
        to: toEmail,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2c3e50; text-align: center;">IT Manager</h2>
            ${messageHtml}
            <div style="text-align:center; margin: 20px 0;">
              <a href="${resetUrl}" style="display:inline-block; padding: 12px 18px; background:#1a73e8; color:white; text-decoration:none; border-radius:6px; font-weight:bold;">${isWelcome ? 'Parola Belirle' : 'Parolayı Sıfırla'}</a>
            </div>
            <p style="font-size:12px; color:#7f8c8d;">Bağlantı çalışmazsa aşağıdaki URL'yi kopyalayıp tarayıcınıza yapıştırın:</p>
            <p style="font-size:12px; color:#7f8c8d; word-break:break-all;">${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="text-align: center; color: #7f8c8d; font-size: 12px;">Bu otomatik bir maildir, lütfen cevaplamayınız.<br/>Bağlantı 2 saat boyunca geçerlidir.</p>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Password reset mail send error:', error);
      return { success: false, error: error.message };
    }
  }

  static async sendHrNotification(toEmail, requestData) {
    try {
      const transporter = this.createTransporter();
      const settings = this.getSmtpSettings();
      const fromEmail = settings.from_email || settings.user;

      const isEntry = requestData.type === 'ENTRY';
      const actionType = isEntry ? 'İşe Alım' : 'İşten Çıkış/Ayrılış';
      const color = isEntry ? '#1a73e8' : '#ea4335';
      let eqs = [];
      try {
          eqs = typeof requestData.equipment_needed === 'string' ? JSON.parse(requestData.equipment_needed) : (requestData.equipment_needed || []);
      } catch (e) {
          eqs = [];
      }

      const html = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
          <div style="background-color: ${color}; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px;">${actionType} Bilgilendirme Formu</h2>
          </div>
          <div style="padding: 24px; background-color: #ffffff; border: 1px solid #dadce0;">
            <h3 style="color: ${color}; font-size: 14px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 2px solid #f1f3f4; padding-bottom: 4px;">KİŞİSEL BİLGİLER</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 40%; color: #5f6368;">Adı Soyadı:</td><td style="padding: 8px 0; color: #202124;">${requestData.full_name || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #5f6368;">${isEntry ? 'İşe Başlama' : 'Ayrılış'} Tarihi:</td><td style="padding: 8px 0; color: #202124;">${requestData.request_date || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #5f6368;">Şirket Unvanı:</td><td style="padding: 8px 0; color: #202124;">${requestData.company || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #5f6368;">Bölümü:</td><td style="padding: 8px 0; color: #202124;">${requestData.department || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #5f6368;">Unvanı:</td><td style="padding: 8px 0; color: #202124;">${requestData.position || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #5f6368;">Bağlı Olduğu Yönetici:</td><td style="padding: 8px 0; color: #202124;">${requestData.manager_name || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #5f6368;">Lokasyon:</td><td style="padding: 8px 0; color: #202124;">${requestData.location || '-'}</td></tr>
            </table>

            <h3 style="color: ${color}; font-size: 14px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 2px solid #f1f3f4; padding-bottom: 4px;">ŞİRKET DONANIMLARI</h3>
            <div style="margin-bottom: 24px; font-size: 13px; color: #202124;">
              ${eqs.length > 0 ? eqs.map(e => `<span style="display:inline-block; background-color: #f1f3f4; padding: 4px 8px; border-radius: 4px; border: 1px solid #dadce0; margin: 0 4px 4px 0;">✓ ${e}</span>`).join('') : '<i>Donanım talebi/iadesi belirtilmedi.</i>'}
            </div>

            <h3 style="color: ${color}; font-size: 14px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 2px solid #f1f3f4; padding-bottom: 4px;">YETKİLENDİRME</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 40%; color: #5f6368;">Mail Grupları:</td><td style="padding: 8px 0; color: #202124;">${requestData.email_groups || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #5f6368;">ERP (Siber) Yetkileri:</td><td style="padding: 8px 0; color: #202124;">${requestData.erp_permissions || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #5f6368;">Dosya Yetkileri:</td><td style="padding: 8px 0; color: #202124;">${requestData.file_permissions || '-'}</td></tr>
            </table>

            <h3 style="color: ${color}; font-size: 14px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 2px solid #f1f3f4; padding-bottom: 4px;">EK NOTLAR</h3>
            <p style="font-size: 13px; color: #3c4043; background-color: #f8f9fa; padding: 12px; border: 1px solid #dadce0;">
              ${requestData.notes || 'Ek not bulunmamaktadır.'}
            </p>
          </div>
          <div style="text-align: center; padding: 16px; font-size: 11px; color: #7f8c8d;">
            Bu e-posta IT Manager İK Modülü tarafından otomatik olarak gönderilmiştir.<br/>
            Lütfen yanıtlamayınız.
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"IT Manager Bildirim" <${fromEmail}>`,
        to: toEmail,
        subject: `[${actionType}] ${requestData.full_name} - ${requestData.department}`,
        html: html
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('HR Mail send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generic mail sending function
   */
  static async sendMail(to, subject, html) {
    try {
      const transporter = this.createTransporter();
      const settings = this.getSmtpSettings();
      const fromEmail = settings.from_email || settings.user;

      const mailOptions = {
        from: `"IT Manager" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Mail send error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = MailerService;

