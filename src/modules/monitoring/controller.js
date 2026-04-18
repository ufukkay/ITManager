const os = require('os');
const osUtils = require('os-utils');
const nodeDiskInfo = require('node-disk-info');
const { db } = require('../../database/db');
const { getPendingUpdateCount, checkOnline } = require('./utils');

// Yerel makine metriklerini VT'ye yansıt (Test için)
const updateLocalMetrics = async () => {
    try {
        const disks = await nodeDiskInfo.getDiskInfo();
        const mainDisk = disks.find(d => d._mounted === '/' || d._mounted === 'C:') || disks[0];
        const updateCount = await getPendingUpdateCount();
        
        osUtils.cpuUsage((cpuPercent) => {
            const freeMem = os.freemem();
            const totalMem = os.totalmem();
            const memUsage = 1 - (freeMem / totalMem);
            
            db.prepare(`
                UPDATE servers 
                SET cpu_usage = ?, ram_usage = ?, disk_usage = ?, pending_updates = ?, last_online = CURRENT_TIMESTAMP 
                WHERE name = 'Local Machine'
            `).run(
                (cpuPercent * 100).toFixed(1),
                (memUsage * 100).toFixed(1),
                mainDisk ? mainDisk._capacity : '0%',
                updateCount
            );
        });
    } catch (err) {
        console.error('Local metrics error:', err);
    }
};

// Diğer sunucuları sembolik olarak güncelle (Ping testi vb.)
const updateRemoteServerStatus = async () => {
    try {
        const servers = db.prepare("SELECT id, ip_address FROM servers WHERE name != 'Local Machine'").all();
        for (const srv of servers) {
            const isOnline = await checkOnline(srv.ip_address);
            db.prepare("UPDATE servers SET status = ?, last_online = CURRENT_TIMESTAMP WHERE id = ?").run(isOnline ? 'online' : 'offline', srv.id);
        }
    } catch (err) {
        console.error('Remote status update error:', err);
    }
};

// Döngüleri başlat
// setInterval(updateLocalMetrics, 30000); // Commented out to prevent crash
// setInterval(updateRemoteServerStatus, 60000); // Commented out to prevent crash

// İlk açılışta bir kere çalıştır
setTimeout(() => {
    // updateLocalMetrics(); // Commented out to prevent crash on Windows without wmic
    updateRemoteServerStatus();
}, 5000);

exports.getServers = (req, res) => {
    try {
        const servers = db.prepare('SELECT * FROM servers ORDER BY name ASC').all();
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: 'Sunucular alınamadı' });
    }
};

exports.addServer = (req, res) => {
    try {
        const { name, ip_address, os_version } = req.body;
        // Eğer aynı isimde sunucu varsa güncelle, yoksa ekle (UPSERT)
        const info = db.prepare(`
            INSERT INTO servers (name, ip_address, os_version) 
            VALUES (?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET ip_address = excluded.ip_address, os_version = excluded.os_version
        `).run(name, ip_address, os_version || 'Windows Server');
        
        res.json({ id: info.lastInsertRowid, message: 'Sunucu başarıyla eklendi/güncellendi' });
    } catch (err) {
        console.error('Add server error:', err);
        res.status(500).json({ error: 'Sunucu kaydedilirken bir hata oluştu: ' + err.message });
    }
};

exports.deleteServer = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM servers WHERE id = ?').run(id);
        res.json({ message: 'Sunucu silindi' });
    } catch (err) {
        res.status(500).json({ error: 'Sunucu silinemedi' });
    }
};

exports.getServerDetail = (req, res) => {
    try {
        const { id } = req.params;
        const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
        res.json(server);
    } catch (err) {
        res.status(500).json({ error: 'Detay alınamadı' });
    }
};

exports.reportAgentData = (req, res) => {
    try {
        const { name, cpu_usage, ram_usage, pending_updates, os_version, status } = req.body;
        
        // İsme göre sunucuyu bul ve verilerini güncelle
        const check = db.prepare('SELECT id FROM servers WHERE name = ?').get(name);
        
        if (check) {
            db.prepare(`
                UPDATE servers 
                SET cpu_usage = ?, ram_usage = ?, pending_updates = ?, os_version = ?, status = ?, last_online = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(cpu_usage, ram_usage, pending_updates, os_version, status, check.id);
        } else {
            // Eğer sunucu listede yoksa otomatik ekle
            db.prepare(`
                INSERT INTO servers (name, cpu_usage, ram_usage, pending_updates, os_version, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(name, cpu_usage, ram_usage, pending_updates, os_version, status);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Agent data error:', err);
        res.status(500).json({ error: 'Veri işlenemedi' });
    }
};

// exports.renderPage = (req, res) => { ... } // Removed EJS version
