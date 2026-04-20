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
  try {
    const columns = db.prepare("PRAGMA table_info(servers)").all();
    if (columns.length > 0) {
        if (!columns.some(c => c.name === 'status')) {
            console.log("Adding status to servers table...");
            db.prepare("ALTER TABLE servers ADD COLUMN status TEXT DEFAULT 'online'").run();
        }
        if (!columns.some(c => c.name === 'description')) {
            console.log("Adding description to servers table...");
            db.prepare("ALTER TABLE servers ADD COLUMN description TEXT").run();
        }
        if (!columns.some(c => c.name === 'type')) {
            console.log("Adding type to servers table...");
            db.prepare("ALTER TABLE servers ADD COLUMN type TEXT DEFAULT 'cloud'").run();
        }
        if (!columns.some(c => c.name === 'created_at')) {
            console.log("Adding created_at to servers table...");
            db.prepare("ALTER TABLE servers ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP").run();
        }
    }
  } catch (e) { console.log("Servers table migration skipped:", e.message); }

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
            description TEXT,
            type TEXT DEFAULT 'cloud',
            last_online DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
  ).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS server_companies (
        server_id INTEGER,
        company_id INTEGER,
        share_ratio REAL DEFAULT 100.0,
        PRIMARY KEY (server_id, company_id),
        FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `).run();

  // HR Requests table (Personnel Entry/Exit)
  // Check for old schema and drop if found (Normalization)
  try {
    const columns = db.prepare("PRAGMA table_info(hr_requests)").all();
    if (columns.length > 0 && columns.some(c => c.name === 'company')) {
        console.log("Renaming old hr_requests table to migrate data...");
        db.prepare("DROP TABLE hr_requests").run();
    }
  } catch (e) {
    console.log("hr_requests table check skipped or error:", e.message);
  }

  db.prepare(
    `
        CREATE TABLE IF NOT EXISTS hr_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('ENTRY', 'EXIT')),
            full_name TEXT NOT NULL,
            position TEXT,
            request_date DATE,
            department_id INTEGER,
            location_id INTEGER,
            company_id INTEGER,
            status TEXT DEFAULT 'PENDING',
            equipment_needed TEXT,
            notes TEXT,
            manager_name TEXT,
            email_groups TEXT,
            erp_permissions TEXT,
            file_permissions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(department_id) REFERENCES departments(id),
            FOREIGN KEY(location_id) REFERENCES locations(id),
            FOREIGN KEY(company_id) REFERENCES companies(id)
        )
    `,
  ).run();

  // --- CORE MASTER DATA TABLES ---
  
  // Companies table (Master)
  try {
    const columns = db.prepare("PRAGMA table_info(companies)").all();
    const hasCompanyIdCol = columns.some(c => c.name === 'company_id');

    if (!hasCompanyIdCol && columns.length > 0) {
        console.log("Adding company_id to companies table...");
        db.prepare("ALTER TABLE companies ADD COLUMN company_id INTEGER").run();
        const comps = db.prepare("SELECT id FROM companies ORDER BY id").all();
        let startId = 1;
        const updateStmt = db.prepare("UPDATE companies SET company_id = ? WHERE id = ?");
        comps.forEach(c => {
            updateStmt.run(startId++, c.id);
        });
    }
  } catch (e) { console.log("Companies check skipped:", e.message); }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER UNIQUE,
        name TEXT UNIQUE NOT NULL,
        tax_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Departments table (Master - Global)
  try {
    const columns = db.prepare("PRAGMA table_info(departments)").all();
    const hasDeptId = columns.some(c => c.name === 'dept_id');
    const hasCompanyId = columns.some(c => c.name === 'company_id');

    if (hasCompanyId && columns.length > 0) {
        console.log("Resetting departments table for global schema...");
        db.prepare("PRAGMA foreign_keys = OFF").run();
        db.prepare("DROP TABLE departments").run();
        db.prepare("PRAGMA foreign_keys = ON").run();
    } else if (!hasDeptId && columns.length > 0) {
        console.log("Adding dept_id to departments table...");
        db.prepare("ALTER TABLE departments ADD COLUMN dept_id INTEGER").run();
        const deps = db.prepare("SELECT id FROM departments ORDER BY id").all();
        let startId = 100;
        const updateStmt = db.prepare("UPDATE departments SET dept_id = ? WHERE id = ?");
        deps.forEach(d => {
            updateStmt.run(startId++, d.id);
        });
    }
  } catch (e) { console.log("Departments check skipped:", e.message); }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dept_id INTEGER UNIQUE,
        name TEXT UNIQUE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Cost Centers table (Master - Global)
  try {
    const columns = db.prepare("PRAGMA table_info(cost_centers)").all();
    const hasCompanyId = columns.some(c => c.name === 'company_id');
    if (hasCompanyId && columns.length > 0) {
        console.log("Resetting cost_centers table for global schema...");
        db.prepare("PRAGMA foreign_keys = OFF").run();
        db.prepare("DROP TABLE cost_centers").run();
        db.prepare("PRAGMA foreign_keys = ON").run();
    }
  } catch (e) { console.log("Cost centers check skipped:", e.message); }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS cost_centers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Personnel table (Master)
  // Check if we need to reset/update schema
  try {
    const columns = db.prepare("PRAGMA table_info(personnel)").all();
    const hasEmployeeId = columns.some(c => c.name === 'employee_id');
    if (!hasEmployeeId && columns.length > 0) {
        console.log("Resetting personnel table for new schema...");
        db.prepare("PRAGMA foreign_keys = OFF").run();
        db.prepare("DROP TABLE personnel").run();
        db.prepare("PRAGMA foreign_keys = ON").run();
    }
  } catch (e) {
    console.log("Personnel table check skipped:", e.message);
  }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS personnel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        title TEXT,
        email TEXT,
        phone TEXT,
        company_id INTEGER,
        department_id INTEGER,
        cost_center_id INTEGER,
        hire_date DATE,
        exit_date DATE,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(company_id) REFERENCES companies(id),
        FOREIGN KEY(department_id) REFERENCES departments(id),
        FOREIGN KEY(cost_center_id) REFERENCES cost_centers(id)
    )
  `).run();

  // --- SIM TRACKING TABLES ---
  db.prepare(`
    CREATE TABLE IF NOT EXISTS operators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('m2m', 'data', 'voice', 'general')),
        operator_id INTEGER NOT NULL,
        price REAL DEFAULT 0,
        data_limit REAL DEFAULT NULL,
        sms_limit INTEGER DEFAULT NULL,
        minutes_limit INTEGER DEFAULT NULL,
        features TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(operator_id) REFERENCES operators(id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plate_no TEXT UNIQUE NOT NULL,
        vehicle_type TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS sim_m2m (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            iccid TEXT,
            phone_no TEXT,
            operator TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            plate_no TEXT,
            vehicle_type TEXT,
            vehicle_id INTEGER,
            notes TEXT,
            package_id INTEGER REFERENCES packages(id),
            company_id INTEGER REFERENCES companies(id),
            personnel_id INTEGER REFERENCES personnel(id),
            department_id INTEGER REFERENCES departments(id),
            last_usage_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sim_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        iccid TEXT,
        phone_no TEXT,
        operator TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        location TEXT,
        location_id INTEGER REFERENCES locations(id),
        notes TEXT,
        package_id INTEGER REFERENCES packages(id),
        company_id INTEGER REFERENCES companies(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sim_voice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        iccid TEXT,
        phone_no TEXT,
        operator TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        personnel_id INTEGER REFERENCES personnel(id),
        notes TEXT,
        package_id INTEGER REFERENCES packages(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operator TEXT NOT NULL,
        period TEXT NOT NULL,
        phone_no TEXT,
        personnel_id INTEGER REFERENCES personnel(id),
        cost_center_id INTEGER REFERENCES cost_centers(id),
        company_id INTEGER REFERENCES companies(id),
        source_file TEXT,
        tariff TEXT,
        amount REAL DEFAULT 0,
        tax_kdv REAL DEFAULT 0,
        tax_oiv REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        is_matched INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // M365 Manager Tables - Refactored to link with Master Data
  db.prepare(`
    CREATE TABLE IF NOT EXISTS m365_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        master_company_id INTEGER REFERENCES companies(id)
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
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        license_id INTEGER REFERENCES m365_licenses(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 0,
        period TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, license_id)
    )
  `).run();
  
  // Migration for m365_allocation_users (Adding personnel_id if missing)
  try {
    const columns = db.prepare("PRAGMA table_info(m365_allocation_users)").all();
    if (columns.length > 0 && !columns.some(c => c.name === 'personnel_id')) {
        console.log("Adding personnel_id to m365_allocation_users table...");
        db.prepare("ALTER TABLE m365_allocation_users ADD COLUMN personnel_id INTEGER REFERENCES personnel(id)").run();
    }
  } catch (e) { console.log("m365_allocation_users migration skipped:", e.message); }
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS m365_allocation_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        allocation_id INTEGER,
        personnel_id INTEGER REFERENCES personnel(id),
        user_name TEXT, -- Legacy support during transit
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

