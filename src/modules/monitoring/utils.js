const { exec, execFile } = require('child_process');
const path = require('path');

// Sadece geçerli IPv4 veya hostname karakterlerine izin verir (harf, rakam, nokta, tire).
// ping komutuna geçmeden önceki savunma katmanı; asıl koruma execFile'ın shell kullanmamasıdır.
const isSafeHost = (value) => /^[a-zA-Z0-9.-]+$/.test(value);

/**
 * Windows makinelerde bekleyen güncelleme sayısını döner.
 * Not: Bu işlem yetki gerektirebilir ve uzun sürebilir.
 * Test amaçlı hızlı bir WMI sorgusu veya kayıt defteri kontrolü yapabilir.
 */
exports.getPendingUpdateCount = () => {
    return new Promise((resolve) => {
        // Hızlı kontrol: Windows Update servisi üzerinden bekleyen yüklemeleri saymak
        // Not: Gerçek bir ortamda PSWindowsUpdate modülü daha sağlıklıdır.
        const script = `
            $UpdateSession = New-Object -ComObject Microsoft.Update.Session
            $UpdateSearcher = $UpdateSession.CreateupdateSearcher()
            $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Software' and IsHidden=0")
            $SearchResult.Updates.Count
        `;

        exec(`powershell -Command "${script.replace(/\n/g, '')}"`, (error, stdout) => {
            if (error) {
                console.error('PS Update Error:', error);
                resolve(0);
                return;
            }
            const count = parseInt(stdout.trim());
            resolve(isNaN(count) ? 0 : count);
        });
    });
};

/**
 * Sunucuya ping atarak online durumunu kontrol eder.
 */
exports.checkOnline = (ip) => {
    return new Promise((resolve) => {
        if (!ip || ip === '127.0.0.1') return resolve(true);
        if (!isSafeHost(ip)) {
            console.error('checkOnline: geçersiz host/IP formatı, ping atlanıyor:', ip);
            return resolve(false);
        }
        // execFile shell kullanmadığı için ip_address içine komut enjekte edilemez.
        execFile('ping', ['-n', '1', '-w', '1000', ip], (error) => {
            resolve(!error);
        });
    });
};

