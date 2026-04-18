const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');

let mainWindow = null;
let tray = null;
let isReporting = false;
let reportInterval = null;

const configPath = path.join(app.getPath('userData'), 'config.json');

// Varsayılan config
let config = {
    serverIP: '',
    serverPort: '3000',
    reportInterval: 60
};

// Config dosyasını oku
function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return true;
        }
    } catch (e) { console.error('Config okuma hatası:', e); }
    return false;
}

// Config dosyasını kaydet
function saveConfig(newConfig) {
    config = { ...config, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// CPU kullanımını hesapla
function getCPUUsage() {
    return new Promise((resolve) => {
        const cpus1 = os.cpus();
        const idle1 = cpus1.reduce((a, c) => a + c.times.idle, 0);
        const total1 = cpus1.reduce((a, c) => a + c.times.user + c.times.nice + c.times.sys + c.times.irq + c.times.idle, 0);
        setTimeout(() => {
            const cpus2 = os.cpus();
            const idle2 = cpus2.reduce((a, c) => a + c.times.idle, 0);
            const total2 = cpus2.reduce((a, c) => a + c.times.user + c.times.nice + c.times.sys + c.times.irq + c.times.idle, 0);
            resolve((1 - (idle2 - idle1) / (total2 - total1)) * 100);
        }, 1000);
    });
}

// Windows Update sayısını bul
function getWindowsUpdates() {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec('powershell -Command "(New-Object -ComObject Microsoft.Update.Session).CreateupdateSearcher().Search(\'IsInstalled=0\').Updates.Count"', (err, stdout) => {
            resolve(err ? 0 : parseInt(stdout.trim()) || 0);
        });
    });
}

// Metrik raporu gönder
async function sendReport() {
    if (!config.serverIP) return;
    try {
        const cpu = await getCPUUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const ram = ((totalMem - freeMem) / totalMem) * 100;
        const updates = await getWindowsUpdates();

        const url = `http://${config.serverIP}:${config.serverPort}/monitoring/api/agent/report`;
        await axios.post(url, {
            name: os.hostname(),
            cpu_usage: cpu.toFixed(1),
            ram_usage: ram.toFixed(1),
            pending_updates: updates,
            os_version: os.type() + ' ' + os.release(),
            status: 'online'
        });

        if (tray) tray.setToolTip(`ITManager Agent - CPU: ${cpu.toFixed(1)}% | RAM: ${ram.toFixed(1)}%`);
    } catch (err) {
        if (tray) tray.setToolTip('ITManager Agent - Bağlantı hatası');
    }
}

// Raporlamayı başlat
function startReporting() {
    if (isReporting) return;
    isReporting = true;
    sendReport();
    reportInterval = setInterval(sendReport, (config.reportInterval || 60) * 1000);
}

// Raporlamayı durdur
function stopReporting() {
    isReporting = false;
    if (reportInterval) clearInterval(reportInterval);
}

// Ayar penceresini oluştur
function createWindow() {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        return;
    }
    mainWindow = new BrowserWindow({
        width: 480,
        height: 520,
        resizable: false,
        frame: false,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.loadFile('ui/setup.html');
    mainWindow.on('closed', () => { mainWindow = null; });
}

// System Tray oluştur
function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    let icon;
    if (fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
    } else {
        // Fallback: 16x16 basit ikon
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('ITManager Agent');

    const contextMenu = Menu.buildFromTemplate([
        { label: 'ITManager Agent v1.0', enabled: false },
        { type: 'separator' },
        { label: '⚙️ Ayarlar', click: () => createWindow() },
        { label: isReporting ? '⏸ Durdur' : '▶️ Başlat', click: () => {
            if (isReporting) { stopReporting(); } else { startReporting(); }
            createTray(); // Menüyü güncelle
        }},
        { type: 'separator' },
        { label: '❌ Çıkış', click: () => { stopReporting(); app.quit(); }}
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => createWindow());
}

// IPC olayları (UI ile iletişim)
ipcMain.on('save-config', (event, newConfig) => {
    saveConfig(newConfig);
    stopReporting();
    startReporting();
    event.reply('config-saved', config);
});

ipcMain.on('get-config', (event) => {
    event.reply('current-config', config);
});

ipcMain.on('test-connection', async (event, testConfig) => {
    try {
        const url = `http://${testConfig.serverIP}:${testConfig.serverPort}/monitoring/api/servers`;
        await axios.get(url, { timeout: 5000 });
        event.reply('connection-result', { success: true });
    } catch {
        event.reply('connection-result', { success: false });
    }
});

ipcMain.on('minimize-to-tray', () => {
    if (mainWindow) mainWindow.hide();
});

// Uygulama başlatma
app.whenReady().then(() => {
    loadConfig();
    createTray();

    if (!config.serverIP) {
        // İlk kurulum: Ayar ekranını göster
        createWindow();
    } else {
        // Zaten ayarlı: Arka planda başlat
        startReporting();
    }
});

app.on('window-all-closed', (e) => {
    e.preventDefault(); // Tray'de çalışmaya devam et
});
