const { exec } = require('child_process');
const path = require('path');

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
        exec(`ping -n 1 -w 1000 ${ip}`, (error) => {
            resolve(!error);
        });
    });
};
