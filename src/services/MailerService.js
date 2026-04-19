const nodemailer = require('nodemailer');
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
   * Sends a welcome email to a newly created user
   * @param {string} toEmail User's email address
   * @param {string} fullName User's full name
   * @param {string} plainPassword User's raw password to login
   */
  static async sendWelcomeEmail(toEmail, fullName, plainPassword) {
    try {
      const transporter = this.createTransporter();
      const settings = this.getSmtpSettings();
      const fromEmail = settings.from_email || settings.user;

      const mailOptions = {
        from: `"IT Manager" <${fromEmail}>`,
        to: toEmail,
        subject: 'IT Manager - Hesabınız Oluşturuldu',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2c3e50; text-align: center;">IT Manager Sistemine Hoşgeldiniz</h2>
            <p>Merhaba <b>${fullName}</b>,</p>
            <p>Sistem yöneticisi tarafından IT Manager paneli için hesabınız oluşturulmuştur.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Giriş Bilgileriniz:</strong></p>
              <p style="margin: 5px 0;">E-posta: <b>${toEmail}</b></p>
              <p style="margin: 5px 0;">Şifre: <b>${plainPassword}</b></p>
            </div>
            <p style="color: #e74c3c; font-size: 13px;"><i>* Güvenliğiniz için sisteme giriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.</i></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="text-align: center; color: #7f8c8d; font-size: 12px;">Bu otomatik bir maildir, lütfen cevaplamayınız.</p>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Welcome email sent: %s', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('E-posta gönderim hatası:', error.message);
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

