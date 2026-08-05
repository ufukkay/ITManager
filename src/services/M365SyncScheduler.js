const { db } = require('../database/db');
const MicrosoftGraphService = require('./MicrosoftGraphService');

// entra_settings.sync_interval_minutes ayarına göre M365 lisans/kullanım verisini periyodik olarak
// Azure'dan yeniden çeker. Ayar her değiştiğinde restart gerekmez; her kontrolde DB'den taze okunur.
class M365SyncScheduler {
  constructor() {
    this.timer = null;
    this.isRunning = false;
  }

  start() {
    if (this.timer) return;
    // Her 5 dakikada bir, ayarlanan sıklığın dolup dolmadığı kontrol edilir
    this.timer = setInterval(() => this.checkAndSync(), 5 * 60 * 1000);
    console.log('M365SyncScheduler started.');
    this.checkAndSync();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkAndSync() {
    if (this.isRunning) return;

    try {
      const settings = db.prepare('SELECT * FROM entra_settings LIMIT 1').get();
      if (!settings || !settings.is_active) return;

      const intervalMinutes = settings.sync_interval_minutes || 60;
      const lastSync = settings.last_sync ? new Date(settings.last_sync.replace(' ', 'T') + 'Z') : null;
      const minutesSince = lastSync ? (Date.now() - lastSync.getTime()) / 60000 : Infinity;

      if (minutesSince < intervalMinutes) return;

      this.isRunning = true;
      console.log(`M365SyncScheduler: otomatik senkronizasyon başlatılıyor (${lastSync ? Math.round(minutesSince) + ' dk önce senkronize edilmişti' : 'daha önce hiç senkronize edilmemiş'}).`);
      const result = await MicrosoftGraphService.sync();
      console.log('M365SyncScheduler: senkronizasyon tamamlandı —', result.message);
    } catch (err) {
      console.error('M365SyncScheduler error:', err.message);
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new M365SyncScheduler();
