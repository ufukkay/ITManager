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
            email TEXT UNIQUE NOT NULL,
            username TEXT,
            password TEXT NOT NULL,
            full_name TEXT,
            role_id INTEGER,
            reset_token TEXT,
            reset_expires DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles(id)
        )
    `,
  ).run();

  // SMTP Settings table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS smtp_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT,
        port INTEGER,
        user TEXT,
        pass TEXT,
        secure INTEGER DEFAULT 1,
        from_email TEXT
    )
  `).run();

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

  // User Permissions table (kullanici bazinda yetki override'lari)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_permissions (
        user_id INTEGER,
        permission_id INTEGER,
        granted INTEGER DEFAULT 1,
        PRIMARY KEY (user_id, permission_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
    )
  `).run();

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
            manager_name TEXT,
            email_groups TEXT,
            erp_permissions TEXT,
            file_permissions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
  ).run();

  // M365 Manager Tables
  db.prepare(`
    CREATE TABLE IF NOT EXISTS m365_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS m365_licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 0,
        unit_price REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'USD'
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS m365_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        license_id INTEGER,
        quantity INTEGER DEFAULT 0,
        period TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES m365_companies(id) ON DELETE CASCADE,
        FOREIGN KEY (license_id) REFERENCES m365_licenses(id) ON DELETE CASCADE,
        UNIQUE(company_id, license_id)
    )
  `).run();
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS m365_allocation_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        allocation_id INTEGER,
        user_name TEXT,
        FOREIGN KEY (allocation_id) REFERENCES m365_allocations(id) ON DELETE CASCADE
    )
  `).run();

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

    // Yetkileri Ekle (Modül:Eylem Formatı)
    const permissions = [
        // Sistem
        { key: 'system:admin', module: 'Sistem', desc: 'Panel yönetimi ve genel ayarlara tam erişim' },
        
        // Sunucu İzleme
        { key: 'monitoring:view', module: 'Sunucu İzleme', desc: 'Sunucu durumlarını ve kaynak kullanımını görüntüleme' },
        { key: 'monitoring:edit', module: 'Sunucu İzleme', desc: 'Sunucu ekleme, silme ve eşik değeri düzenleme' },
        
        // SIM Takip
        { key: 'sim:view', module: 'SIM Takip', desc: 'SIM kart listesini ve zimmet bilgilerini görüntüleme' },
        { key: 'sim:edit', module: 'SIM Takip', desc: 'SIM kart ekleme, transfer ve düzenleme yetkisi' },
        
        // Fatura Yönetimi
        { key: 'invoice:view', module: 'Fatura Yönetimi', desc: 'Fatura özetlerini ve detaylarını görüntüleme' },
        { key: 'invoice:edit', module: 'Fatura Yönetimi', desc: 'Fatura yükleme (PDF/XML) ve veri eşleştirme yetkisi' },
        
        // İK Bildirimleri
        { key: 'hr:view', module: 'İK Bildirimleri', desc: 'Personel giriş/çıkış taleplerini görüntüleme' },
        { key: 'hr:edit', module: 'İK Bildirimleri', desc: 'Personel giriş/çıkış talebi oluşturma ve onaylama' },
        
        // M365 Lisans Yönetimi
        { key: 'm365:view', module: 'M365 Lisans Yönetimi', desc: 'M365 lisans, şirket ve dağıtım durumlarını görüntüleme' },
        { key: 'm365:edit', module: 'M365 Lisans Yönetimi', desc: 'M365 dağıtım ve lisansları düzenleme / veri analiz etme' }
    ];

    permissions.forEach(p => {
        db.prepare('INSERT OR IGNORE INTO permissions (permission_key, module, description) VALUES (?, ?, ?)').run(p.key, p.module, p.desc);
    });

    // Admin kullanıcısını ekle
    const bcrypt = require('bcryptjs');
    const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('Admin');
    const adminCheck = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@talay.com');
    if (!adminCheck && adminRole) {
        const hashedPass = bcrypt.hashSync('admin123', 10);
        db.prepare(`
            INSERT INTO users (email, username, password, full_name, role_id) 
            VALUES (?, ?, ?, ?, ?)
        `).run('admin@talay.com', 'admin', hashedPass, 'Sistem Yöneticisi', adminRole.id);
    }
    console.log("Başlangıç verileri kontrol edildi/eklendi.");
};

module.exports = {
  db,
  initDb,
};

