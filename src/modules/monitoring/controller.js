const os = require('os');
const osUtils = require('os-utils');
const nodeDiskInfo = require('node-disk-info');
const { db } = require('../../database/db');
const { getPendingUpdateCount, checkOnline } = require('./utils');
const MailerService = require('../../services/MailerService');

// In-memory cache for alerts to prevent spam (max 1 alert per server per hour for each type)
const alertCache = {};

const sendAlertEmail = async (serverName, subject, message) => {
    try {
        const adminEmail = 'admin@talay.com';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #c5221f; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #c5221f; padding: 18px; color: white; font-weight: bold; text-align: center; font-size: 18px; letter-spacing: 0.5px;">
                    🚨 Sunucu Alarm Bildirimi
                </div>
                <div style="padding: 24px; color: #202124; font-size: 14px; line-height: 1.6; background-color: #ffffff;">
                    <p style="margin-top: 0;">Sayın Yetkili,</p>
                    <p>Sistem izleme servisi tarafından aşağıdaki kritik durum tespit edilmiştir:</p>
                    <div style="background-color: #fce8e6; border-left: 4px solid #c5221f; padding: 12px 16px; margin: 18px 0; border-radius: 4px;">
                        <p style="margin: 0 0 6px 0;"><b>Sunucu Adı:</b> ${serverName}</p>
                        <p style="margin: 0 0 6px 0;"><b>Durum/Kategori:</b> ${subject}</p>
                        <p style="margin: 0;"><b>Alarm Detayı:</b> ${message}</p>
                    </div>
                    <p style="margin-bottom: 0; font-size: 13px; color: #5f6368;"><b>Tespit Zamanı:</b> ${new Date().toLocaleString('tr-TR')}</p>
                    <hr style="border: none; border-top: 1px solid #e8eaed; margin: 24px 0;" />
                    <p style="font-size: 11px; color: #7f8c8d; text-align: center; margin: 0;">Bu otomatik bir bildirimdir, lütfen bu e-postayı yanıtlamayınız.</p>
                </div>
            </div>
        `;
        await MailerService.sendMail(adminEmail, `[ITManager Alarm] ${serverName} - ${subject}`, html);
        console.log(`Alert email sent for ${serverName}: ${subject}`);
    } catch (err) {
        console.error('Failed to send alert email:', err.message);
    }
};

const processAlertCheck = (server) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // 1. Durum Kontrolü (Offline)
    if (server.status === 'offline') {
        const cacheKey = `${server.name}_offline`;
        if (!alertCache[cacheKey] || (now - alertCache[cacheKey]) > oneHour) {
            alertCache[cacheKey] = now;
            sendAlertEmail(server.name, 'ÇEVRİMDIŞI ALARMI', 'Sunucuya erişim sağlanamıyor! Durum: OFFLINE.');
        }
    }
    
    // 2. CPU Aşımı Kontrolü ( > %90)
    if (server.cpu_usage && parseFloat(server.cpu_usage) > 90) {
        const cacheKey = `${server.name}_cpu`;
        if (!alertCache[cacheKey] || (now - alertCache[cacheKey]) > oneHour) {
            alertCache[cacheKey] = now;
            sendAlertEmail(server.name, 'YÜKSEK CPU KULLANIMI', `Sunucu CPU kullanımı kritik seviyede: %${server.cpu_usage}`);
        }
    }
    
    // 3. RAM Aşımı Kontrolü ( > %90)
    if (server.ram_usage && parseFloat(server.ram_usage) > 90) {
        const cacheKey = `${server.name}_ram`;
        if (!alertCache[cacheKey] || (now - alertCache[cacheKey]) > oneHour) {
            alertCache[cacheKey] = now;
            sendAlertEmail(server.name, 'YÜKSEK BELLEK KULLANIMI', `Sunucu RAM kullanımı kritik seviyede: %${server.ram_usage}`);
        }
    }
};

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

            // Check alerts
            const updatedServer = db.prepare("SELECT * FROM servers WHERE name = 'Local Machine'").get();
            if (updatedServer) {
                processAlertCheck(updatedServer);
            }
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

            // Check alerts
            const updatedServer = db.prepare("SELECT * FROM servers WHERE id = ?").get(srv.id);
            if (updatedServer) {
                processAlertCheck(updatedServer);
            }
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
        // Şirket atamalarını ekle
        const enrichedServers = servers.map(srv => {
            const companies = db.prepare(`
                SELECT sc.company_id, c.name, sc.share_ratio 
                FROM server_companies sc
                JOIN companies c ON sc.company_id = c.id
                WHERE sc.server_id = ?
            `).all(srv.id);
            return { ...srv, companies };
        });
        res.json(enrichedServers);
    } catch (err) {
        res.status(500).json({ error: 'Sunucular alınamadı' });
    }
};

exports.addServer = (req, res) => {
    try {
        const { name, ip_address, os_version, description, companies, type } = req.body;
        
        const transaction = db.transaction(() => {
            // Upsert Server
            const info = db.prepare(`
                INSERT INTO servers (name, ip_address, os_version, description, type) 
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET 
                    ip_address = excluded.ip_address, 
                    os_version = excluded.os_version,
                    description = excluded.description,
                    type = excluded.type
            `).run(name, ip_address, os_version || 'Windows Server', description || '', type || 'cloud');

            const serverId = info.lastInsertRowid || db.prepare('SELECT id FROM servers WHERE name = ?').get(name).id;

            // Şirket atamalarını güncelle
            if (companies && Array.isArray(companies)) {
                db.prepare('DELETE FROM server_companies WHERE server_id = ?').run(serverId);
                const insertShare = db.prepare('INSERT INTO server_companies (server_id, company_id, share_ratio) VALUES (?, ?, ?)');
                for (const comp of companies) {
                    insertShare.run(serverId, comp.id, comp.share_ratio || (100 / companies.length));
                }
            }
            return serverId;
        });

        const serverId = transaction();
        res.json({ id: serverId, message: 'Sunucu başarıyla kaydedildi' });
    } catch (err) {
        console.error('Save server error:', err);
        res.status(500).json({ error: 'Sunucu kaydedilirken hata oluştu: ' + err.message });
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
        const { name, cpu_usage, ram_usage, pending_updates, os_version, status, type } = req.body;
        
        // İsme göre sunucuyu bul ve verilerini güncelle
        const check = db.prepare('SELECT id FROM servers WHERE name = ?').get(name);
        let serverId = null;
        
        if (check) {
            serverId = check.id;
            db.prepare(`
                UPDATE servers 
                SET cpu_usage = ?, ram_usage = ?, pending_updates = ?, os_version = ?, status = ?, type = ?, last_online = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(cpu_usage, ram_usage, pending_updates, os_version, status, type || 'cloud', serverId);
        } else {
            // Eğer sunucu listede yoksa otomatik ekle
            const info = db.prepare(`
                INSERT INTO servers (name, cpu_usage, ram_usage, pending_updates, os_version, status, type) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(name, cpu_usage, ram_usage, pending_updates, os_version, status, type || 'cloud');
            serverId = info.lastInsertRowid;
        }

        // Check alerts
        const updatedServer = db.prepare("SELECT * FROM servers WHERE id = ?").get(serverId);
        if (updatedServer) {
            processAlertCheck(updatedServer);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Agent data error:', err);
        res.status(500).json({ error: 'Veri işlenemedi' });
    }
};

// exports.renderPage = (req, res) => { ... } // Removed EJS version

