const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "../../data/itmanager.db");

// Veri dizininin var olduğundan emin ol
if (!fs.existsSync(path.join(__dirname, "../../data"))) {
  fs.mkdirSync(path.join(__dirname, "../../data"), { recursive: true });
}

const db = new Database(dbPath);

// Tabloları Oluştur
const initDb = () => {
  // Users table
  db.prepare(
    `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT,
            role_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles(id)
        )
    `,
  ).run();

  // Roles table
  db.prepare(
    `
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT
        )
    `,
  ).run();

  // Permissions table
  db.prepare(
    `
        CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            permission_key TEXT UNIQUE NOT NULL,
            module TEXT NOT NULL,
            description TEXT
        )
    `,
  ).run();

  // Role Permissions table
  db.prepare(
    `
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER,
            permission_id INTEGER,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles(id),
            FOREIGN KEY (permission_id) REFERENCES permissions(id)
        )
    `,
  ).run();

  // Servers table
  db.prepare(
    `
        CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            ip_address TEXT,
            os_version TEXT,
            cpu_usage REAL DEFAULT 0,
            ram_usage REAL DEFAULT 0,
            disk_usage TEXT,
            pending_updates INTEGER DEFAULT 0,
            status TEXT DEFAULT 'online',
            last_online DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
  ).run();

  // HR Requests table (Personnel Entry/Exit)
  db.prepare(
    `
        CREATE TABLE IF NOT EXISTS hr_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('ENTRY', 'EXIT')),
            full_name TEXT NOT NULL,
            position TEXT,
            request_date DATE,
            department TEXT,
            location TEXT,
            company TEXT,
            status TEXT DEFAULT 'PENDING',
            equipment_needed TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
  ).run();

  console.log("Veritabanı tabloları hazır.");

  // Başlangıç Verilerini Ekle (Seed)
  seedInitialData();
};

const seedInitialData = () => {
    // Rolleri Ekle
    const roles = [
        { name: 'Admin', description: 'Tam yetkili sistem yöneticisi' },
        { name: 'User', description: 'Standart kullanıcı' },
        { name: 'HR', description: 'İnsan kaynakları personeli' }
    ];

    roles.forEach(role => {
        db.prepare('INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)').run(role.name, role.description);
    });

    // Yetkileri Ekle
    const permissions = [
        { key: 'ADMIN_ACCESS', module: 'System', desc: 'Panel yönetimi ve yetki ayarlarına erişim' },
        { key: 'MONITORING_VIEW', module: 'Monitoring', desc: 'Sunucu izleme ekranını görüntüleme' },
        { key: 'MONITORING_EDIT', module: 'Monitoring', desc: 'Sunucu ekleme/silme yetkisi' },
        { key: 'SIM_TAKIP_VIEW', module: 'SimCardTracking', desc: 'SIM kart listesini görüntüleme' },
        { key: 'SIM_TAKIP_EDIT', module: 'SimCardTracking', desc: 'SIM kart düzenleme/silme yetkisi' },
        { key: 'SIM_INVOICE_VIEW', module: 'SimCardTracking', desc: 'Fatura özetlerini ve detaylarını görüntüleme' },
        { key: 'SIM_INVOICE_EDIT', module: 'SimCardTracking', desc: 'Fatura yükleme ve silme yetkisi' },
        { key: 'HR_REQUESTS_VIEW', module: 'HR', desc: 'Personel giriş/çıkış taleplerini görüntüleme' },
        { key: 'HR_REQUESTS_EDIT', module: 'HR', desc: 'Personel giriş/çıkış talebi oluşturma/düzenleme' }
    ];

    permissions.forEach(p => {
        db.prepare('INSERT OR IGNORE INTO permissions (permission_key, module, description) VALUES (?, ?, ?)').run(p.key, p.module, p.desc);
    });

    // Tüm yetkileri Admin'e ata
    const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('Admin');
    if (adminRole) {
        const allPermissions = db.prepare('SELECT id FROM permissions').all();
        const stmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
        allPermissions.forEach(p => {
            stmt.run(adminRole.id, p.id);
        });
    }
    console.log("Başlangıç verileri kontrol edildi/eklendi.");
};

module.exports = {
  db,
  initDb,
};
