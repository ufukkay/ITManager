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
  // Users table migrations
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all();
    if (columns.length > 0 && !columns.some(c => c.name === 'personnel_id')) {
        console.log("Adding personnel_id to users table...");
        db.prepare("ALTER TABLE users ADD COLUMN personnel_id INTEGER REFERENCES personnel(id)").run();
    }
  } catch (e) { console.log("users migration skipped:", e.message); }

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
            personnel_id INTEGER REFERENCES personnel(id),
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
            db.prepare("ALTER TABLE servers ADD COLUMN created_at DATETIME DEFAULT '2024-01-01 00:00:00'").run();
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

  // Thermal Label Templates & Mobile Audit Tables
  db.prepare(`
    CREATE TABLE IF NOT EXISTS label_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        width_mm REAL DEFAULT 70.0,
        height_mm REAL DEFAULT 35.0,
        config_json TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS asset_audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        audited_by INTEGER,
        audited_by_name TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `).run();

  // Seed default 70x35mm Thermal Template if empty
  const tCount = db.prepare('SELECT COUNT(*) as c FROM label_templates').get().c;
  if (tCount === 0) {
    const defaultConfig = JSON.stringify({
      width_mm: 70,
      height_mm: 35,
      elements: [
        { id: 'company', type: 'company', label: 'Şirket Adı', x: 5, y: 4, fontSize: 10, fontWeight: 'extrabold', color: '#000000' },
        { id: 'qr', type: 'qr', label: 'QR Kod (Mobil Audit Linki)', x: 5, y: 28, size: 75 },
        { id: 'model', type: 'model', label: 'Marka & Model', x: 34, y: 30, fontSize: 12, fontWeight: 'extrabold', color: '#000000' },
        { id: 'serial', type: 'serial', label: 'Seri Numarası', x: 34, y: 54, fontSize: 11, fontWeight: 'bold', color: '#1e40af' },
        { id: 'barcode', type: 'barcode_text', label: 'Envanter No', x: 34, y: 74, fontSize: 10.5, fontWeight: 'bold', color: '#000000' },
        { id: 'barcode1d', type: 'barcode1d', label: '1D Lazer Barkod', x: 5, y: 88, height: 22 }
      ]
    });
    db.prepare('INSERT INTO label_templates (name, width_mm, height_mm, config_json, is_default) VALUES (?, ?, ?, ?, ?)').run('Standart 70x35mm Termal Rulo', 70.0, 35.0, defaultConfig, 1);
  }

  // HR Requests table (Personnel Entry/Exit)
  // Check for old schema and drop if found (Normalization)
  try {
    const columns = db.prepare("PRAGMA table_info(hr_requests)").all();
    if (columns.length > 0 && !columns.some(c => c.name === 'photo_path')) {
        console.log("Adding photo_path to hr_requests table...");
        db.prepare("ALTER TABLE hr_requests ADD COLUMN photo_path TEXT").run();
    }
    if (columns.length > 0 && !columns.some(c => c.name === 'email')) {
        console.log("Adding email to hr_requests table...");
        db.prepare("ALTER TABLE hr_requests ADD COLUMN email TEXT").run();
    }
    if (columns.length > 0 && !columns.some(c => c.name === 'first_name')) {
        console.log("Adding first_name/last_name to hr_requests table...");
        db.prepare("ALTER TABLE hr_requests ADD COLUMN first_name TEXT").run();
        db.prepare("ALTER TABLE hr_requests ADD COLUMN last_name TEXT").run();
    }
    if (columns.length > 0 && !columns.some(c => c.name === 'position_tr')) {
        console.log("Adding position_tr/en to hr_requests table...");
        db.prepare("ALTER TABLE hr_requests ADD COLUMN position_tr TEXT").run();
        db.prepare("ALTER TABLE hr_requests ADD COLUMN position_en TEXT").run();
    }
    if (columns.length > 0 && !columns.some(c => c.name === 'cost_center_id')) {
        console.log("Adding cost_center_id to hr_requests table...");
        db.prepare("ALTER TABLE hr_requests ADD COLUMN cost_center_id INTEGER").run();
    }
  } catch (e) { console.log("hr_requests migration skipped:", e.message); }

  db.prepare(
    `
        CREATE TABLE IF NOT EXISTS hr_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('ENTRY', 'EXIT')),
            first_name TEXT,
            last_name TEXT,
            full_name TEXT,
            position_tr TEXT,
            position_en TEXT,
            position TEXT,
            request_date DATE,
            department_id INTEGER,
            location_id INTEGER,
            company_id INTEGER,
            cost_center_id INTEGER,
            status TEXT DEFAULT 'PENDING',
            equipment_needed TEXT,
            notes TEXT,
            manager_name TEXT,
            email_groups TEXT,
            erp_permissions TEXT,
            file_permissions TEXT,
            photo_path TEXT,
            email TEXT,
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
    if (columns.length > 0 && !columns.some(c => c.name === 'website')) {
        console.log("Adding website to companies table...");
        db.prepare("ALTER TABLE companies ADD COLUMN website TEXT").run();
    }
  } catch (e) { console.log("Companies check skipped:", e.message); }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER UNIQUE,
        name TEXT UNIQUE NOT NULL,
        tax_number TEXT,
        website TEXT,
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
    if (columns.length > 0 && !columns.some(c => c.name === 'photo_path')) {
        console.log("Adding photo_path to personnel table...");
        db.prepare("ALTER TABLE personnel ADD COLUMN photo_path TEXT").run();
    }
    if (columns.length > 0 && !columns.some(c => c.name === 'title_tr')) {
        console.log("Adding title_tr/en to personnel table...");
        db.prepare("ALTER TABLE personnel ADD COLUMN title_tr TEXT").run();
        db.prepare("ALTER TABLE personnel ADD COLUMN title_en TEXT").run();
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
        title_tr TEXT,
        title_en TEXT,
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
        photo_path TEXT,
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

  // sim_data table migrations
  try {
    const columns = db.prepare("PRAGMA table_info(sim_data)").all();
    if (columns.length > 0) {
      if (!columns.some(c => c.name === 'company_id')) {
        console.log("Adding company_id to sim_data table...");
        db.prepare("ALTER TABLE sim_data ADD COLUMN company_id INTEGER REFERENCES companies(id)").run();
      }
    }
  } catch (e) { console.log("sim_data migration skipped:", e.message); }

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


  // sim_voice table migrations
  try {
    const columns = db.prepare("PRAGMA table_info(sim_voice)").all();
    if (columns.length > 0) {
      if (!columns.some(c => c.name === 'company_id')) {
        console.log("Adding company_id to sim_voice table...");
        db.prepare("ALTER TABLE sim_voice ADD COLUMN company_id INTEGER REFERENCES companies(id)").run();
      }
      if (!columns.some(c => c.name === 'department_id')) {
        console.log("Adding department_id to sim_voice table...");
        db.prepare("ALTER TABLE sim_voice ADD COLUMN department_id INTEGER REFERENCES departments(id)").run();
      }
    }
  } catch (e) { console.log("sim_voice migration skipped:", e.message); }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sim_voice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        iccid TEXT,
        phone_no TEXT,
        operator TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        personnel_id INTEGER REFERENCES personnel(id),
        company_id INTEGER REFERENCES companies(id),
        department_id INTEGER REFERENCES departments(id),
        notes TEXT,
        package_id INTEGER REFERENCES packages(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();


  // Invoices table
  try {
    const columns = db.prepare("PRAGMA table_info(invoices)").all();
    if (columns.length > 0 && !columns.some(c => c.name === 'invoice_type')) {
        console.log("Adding invoice_type to invoices table...");
        db.prepare("ALTER TABLE invoices ADD COLUMN invoice_type TEXT DEFAULT 'gsm'").run();
    }
  } catch (e) { console.log("Invoices migration skipped:", e.message); }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_type TEXT DEFAULT 'gsm', -- gsm, m365, server, etc
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
        category TEXT DEFAULT 'M365', -- M365, Adobe, CAD, Antivirus, etc.
        quantity INTEGER DEFAULT 0,
        unit_price REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'USD'
    )
  `).run();

  try {
    const columns = db.prepare("PRAGMA table_info(m365_licenses)").all();
    if (columns.length > 0 && !columns.some(c => c.name === 'category')) {
        console.log("Adding category to m365_licenses table...");
        db.prepare("ALTER TABLE m365_licenses ADD COLUMN category TEXT DEFAULT 'M365'").run();
    }
  } catch (e) { console.log("m365_licenses migration skipped:", e.message); }

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

  // Migration: Check if company_id incorrectly references m365_companies
  try {
    const fks = db.prepare("PRAGMA foreign_key_list('m365_allocations')").all();
    if (fks.some(fk => fk.table === 'm365_companies')) {
        console.log("Fixing m365_allocations foreign key (pointing to companies)...");
        db.prepare("PRAGMA foreign_keys = OFF").run();
        db.prepare("CREATE TABLE m365_allocations_new (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE, license_id INTEGER REFERENCES m365_licenses(id) ON DELETE CASCADE, quantity INTEGER DEFAULT 0, period TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(company_id, license_id))").run();
        db.prepare("INSERT INTO m365_allocations_new SELECT * FROM m365_allocations").run();
        db.prepare("DROP TABLE m365_allocations").run();
        db.prepare("ALTER TABLE m365_allocations_new RENAME TO m365_allocations").run();
        db.prepare("PRAGMA foreign_keys = ON").run();
    }
  } catch (e) { console.log("m365_allocations FK migration skipped:", e.message); }
  
  // Migration for m365_allocation_users (Adding personnel_id, last_activity_date, mail_active, teams_active if missing)
  try {
    const columns = db.prepare("PRAGMA table_info(m365_allocation_users)").all();
    if (columns.length > 0) {
        if (!columns.some(c => c.name === 'personnel_id')) {
            console.log("Adding personnel_id to m365_allocation_users table...");
            db.prepare("ALTER TABLE m365_allocation_users ADD COLUMN personnel_id INTEGER REFERENCES personnel(id)").run();
        }
        if (!columns.some(c => c.name === 'last_activity_date')) {
            console.log("Adding last_activity_date to m365_allocation_users table...");
            db.prepare("ALTER TABLE m365_allocation_users ADD COLUMN last_activity_date DATETIME").run();
        }
        if (!columns.some(c => c.name === 'mail_active')) {
            console.log("Adding mail_active to m365_allocation_users table...");
            db.prepare("ALTER TABLE m365_allocation_users ADD COLUMN mail_active INTEGER DEFAULT 1").run();
        }
        if (!columns.some(c => c.name === 'teams_active')) {
            console.log("Adding teams_active to m365_allocation_users table...");
            db.prepare("ALTER TABLE m365_allocation_users ADD COLUMN teams_active INTEGER DEFAULT 1").run();
        }
    }
  } catch (e) { console.log("m365_allocation_users migration skipped:", e.message); }
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS m365_allocation_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        allocation_id INTEGER,
        personnel_id INTEGER REFERENCES personnel(id),
        user_name TEXT, -- Legacy support during transit
        last_activity_date DATETIME,
        mail_active INTEGER DEFAULT 1,
        teams_active INTEGER DEFAULT 1,
        FOREIGN KEY (allocation_id) REFERENCES m365_allocations(id) ON DELETE CASCADE
    )
  `).run();

  // Entra ID Settings table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS entra_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT,
        client_id TEXT,
        client_secret TEXT,
        is_active INTEGER DEFAULT 0,
        sync_interval_minutes INTEGER DEFAULT 60,
        last_sync DATETIME
    )
  `).run();

  // Audit Logs table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        module TEXT NOT NULL,
        action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
        resource_id TEXT,
        details TEXT, -- JSON string for changes
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  // --- ASSET MANAGEMENT TABLES ---
  db.prepare(`
    CREATE TABLE IF NOT EXISTS asset_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS asset_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS asset_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        brand_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, category_id, brand_id),
        FOREIGN KEY(category_id) REFERENCES asset_categories(id),
        FOREIGN KEY(brand_id) REFERENCES asset_brands(id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS asset_statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // assets table migrations
  try {
    const columns = db.prepare("PRAGMA table_info(assets)").all();
    if (columns.length > 0) {
      if (!columns.some(c => c.name === 'invoice_path')) {
        console.log("Adding invoice_path to assets table...");
        db.prepare("ALTER TABLE assets ADD COLUMN invoice_path TEXT").run();
      }
      if (!columns.some(c => c.name === 'warranty_path')) {
        console.log("Adding warranty_path to assets table...");
        db.prepare("ALTER TABLE assets ADD COLUMN warranty_path TEXT").run();
      }
      if (!columns.some(c => c.name === 'mac_address')) {
        console.log("Adding mac_address to assets table...");
        db.prepare("ALTER TABLE assets ADD COLUMN mac_address TEXT").run();
      }
      if (!columns.some(c => c.name === 'ip_address')) {
        console.log("Adding ip_address to assets table...");
        db.prepare("ALTER TABLE assets ADD COLUMN ip_address TEXT").run();
      }
      if (!columns.some(c => c.name === 'cpu_model')) {
        console.log("Adding cpu_model to assets table...");
        db.prepare("ALTER TABLE assets ADD COLUMN cpu_model TEXT").run();
      }
      if (!columns.some(c => c.name === 'ram_gb')) {
        console.log("Adding ram_gb to assets table...");
        db.prepare("ALTER TABLE assets ADD COLUMN ram_gb INTEGER").run();
      }
      if (!columns.some(c => c.name === 'disk_gb')) {
        console.log("Adding disk_gb to assets table...");
        db.prepare("ALTER TABLE assets ADD COLUMN disk_gb INTEGER").run();
      }
      if (!columns.some(c => c.name === 'os_version')) {
        console.log("Adding os_version to assets table...");
        db.prepare("ALTER TABLE assets ADD COLUMN os_version TEXT").run();
      }
    }
  } catch (e) { console.log("assets migration skipped:", e.message); }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serial_no TEXT UNIQUE NOT NULL,
        barcode TEXT UNIQUE,
        model_id INTEGER NOT NULL,
        status_id INTEGER NOT NULL,
        company_id INTEGER NOT NULL,
        location_id INTEGER,
        personnel_id INTEGER,
        purchase_price REAL DEFAULT 0,
        purchase_date DATE,
        lifetime_months INTEGER DEFAULT 60,
        invoice_path TEXT,
        warranty_path TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(model_id) REFERENCES asset_models(id),
        FOREIGN KEY(status_id) REFERENCES asset_statuses(id),
        FOREIGN KEY(company_id) REFERENCES companies(id),
        FOREIGN KEY(location_id) REFERENCES locations(id),
        FOREIGN KEY(personnel_id) REFERENCES personnel(id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS asset_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        action TEXT NOT NULL, -- CHECKOUT, CHECKIN, STATUS_CHANGE, CREATE, UPDATE
        target_type TEXT, -- PERSONNEL, LOCATION, NONE
        target_id INTEGER,
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `).run();

  // --- HELPDESK TABLES ---
  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL DEFAULT 'Genel',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_subcategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER REFERENCES helpdesk_categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id, name)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_no TEXT UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        personnel_id INTEGER REFERENCES personnel(id),
        category_id INTEGER REFERENCES helpdesk_categories(id),
        subcategory_id INTEGER REFERENCES helpdesk_subcategories(id),
        related_dep_id INTEGER REFERENCES departments(id),
        ticket_type TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT DEFAULT 'Normal',
        status TEXT DEFAULT 'Açık',
        assigned_to INTEGER REFERENCES users(id),
        sla_due_at DATETIME,
        total_work_seconds INTEGER DEFAULT 0,
        resolution_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        closed_at DATETIME
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        is_internal INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
        message_id INTEGER REFERENCES helpdesk_messages(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS imap_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT,
        port INTEGER,
        user TEXT,
        password TEXT,
        tls INTEGER DEFAULT 1,
        delete_after_read INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 0
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_work_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        duration_seconds INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_ticket_collaborators (
        ticket_id INTEGER REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (ticket_id, user_id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_checklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        is_checked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS helpdesk_csat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER UNIQUE REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
        feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Helpdesk Migrations
  try {
    const columns = db.prepare("PRAGMA table_info(helpdesk_tickets)").all();
    if (columns.length > 0) {
      if (!columns.some(c => c.name === 'sla_due_at')) {
        console.log("Adding sla_due_at to helpdesk_tickets table...");
        db.prepare("ALTER TABLE helpdesk_tickets ADD COLUMN sla_due_at DATETIME").run();
      }
      if (!columns.some(c => c.name === 'total_work_seconds')) {
        console.log("Adding total_work_seconds to helpdesk_tickets table...");
        db.prepare("ALTER TABLE helpdesk_tickets ADD COLUMN total_work_seconds INTEGER DEFAULT 0").run();
      }
      if (!columns.some(c => c.name === 'resolution_note')) {
        console.log("Adding resolution_note to helpdesk_tickets table...");
        db.prepare("ALTER TABLE helpdesk_tickets ADD COLUMN resolution_note TEXT").run();
      }
      if (!columns.some(c => c.name === 'related_dep_id')) {
        console.log("Adding related_dep_id to helpdesk_tickets table...");
        db.prepare("ALTER TABLE helpdesk_tickets ADD COLUMN related_dep_id INTEGER REFERENCES departments(id)").run();
      }
      if (!columns.some(c => c.name === 'ticket_type')) {
        console.log("Adding ticket_type to helpdesk_tickets table...");
        db.prepare("ALTER TABLE helpdesk_tickets ADD COLUMN ticket_type TEXT").run();
      }
    }
  } catch (e) { console.log("helpdesk_tickets migration skipped:", e.message); }

  // Personnel table migrations
  try {
    const personnelCols = db.prepare("PRAGMA table_info(personnel)").all();
    if (personnelCols.length > 0) {
      if (!personnelCols.some(c => c.name === 'entra_id')) {
        console.log("Adding entra_id to personnel table...");
        db.prepare("ALTER TABLE personnel ADD COLUMN entra_id TEXT").run();
      }
      if (!personnelCols.some(c => c.name === 'source')) {
        console.log("Adding source to personnel table...");
        db.prepare("ALTER TABLE personnel ADD COLUMN source TEXT DEFAULT 'manual'").run();
      }
      
      // Assign employee_id to personnel where it is NULL
      const nullEmp = db.prepare("SELECT id FROM personnel WHERE employee_id IS NULL ORDER BY id").all();
      if (nullEmp.length > 0) {
        console.log(`Veritabanında ${nullEmp.length} adet Sicil No bulunmayan personel tespit edildi. Otomatik atanıyor...`);
        const lastRow = db.prepare("SELECT MAX(employee_id) as max_id FROM personnel").get();
        let nextEmpId = Math.max(lastRow.max_id || 999, 999) + 1;
        const updateEmpStmt = db.prepare("UPDATE personnel SET employee_id = ? WHERE id = ?");
        db.transaction(() => {
          for (const p of nullEmp) {
            updateEmpStmt.run(nextEmpId++, p.id);
          }
        })();
        console.log("Sicil numaraları başarıyla atandı.");
      }
    }
  } catch (e) { console.log("Personnel migration skipped:", e.message); }

  // m365_licenses table migrations
  try {
    const licCols = db.prepare("PRAGMA table_info(m365_licenses)").all();
    if (licCols.length > 0) {
      if (!licCols.some(c => c.name === 'sku_id')) {
        console.log("Adding sku_id to m365_licenses table...");
        db.prepare("ALTER TABLE m365_licenses ADD COLUMN sku_id TEXT").run();
      }
      if (!licCols.some(c => c.name === 'sku_part_number')) {
        console.log("Adding sku_part_number to m365_licenses table...");
        db.prepare("ALTER TABLE m365_licenses ADD COLUMN sku_part_number TEXT").run();
      }
      if (!licCols.some(c => c.name === 'consumed_units')) {
        console.log("Adding consumed_units to m365_licenses table...");
        db.prepare("ALTER TABLE m365_licenses ADD COLUMN consumed_units INTEGER DEFAULT 0").run();
      }
    }
  } catch (e) { console.log("m365_licenses migration skipped:", e.message); }

  // Entra settings table migrations
  try {
    const entraCols = db.prepare("PRAGMA table_info(entra_settings)").all();
    if (entraCols.length > 0) {
      if (!entraCols.some(c => c.name === 'allowed_domains')) {
        console.log("Adding allowed_domains to entra_settings table...");
        db.prepare("ALTER TABLE entra_settings ADD COLUMN allowed_domains TEXT DEFAULT '[\"talay.com\"]'").run();
      }
      if (!entraCols.some(c => c.name === 'domain_company_map')) {
        console.log("Adding domain_company_map to entra_settings table...");
        db.prepare("ALTER TABLE entra_settings ADD COLUMN domain_company_map TEXT DEFAULT '{}'").run();
      }
    }
  } catch (e) { console.log("Entra settings migration skipped:", e.message); }

  // Entra settings table (ensure it exists)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS entra_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT,
        client_id TEXT,
        client_secret TEXT,
        is_active INTEGER DEFAULT 0,
        sync_interval_minutes INTEGER DEFAULT 60,
        last_sync DATETIME,
        allowed_domains TEXT DEFAULT '["talay.com"]',
        domain_company_map TEXT DEFAULT '{}'
    )
  `).run();

  // Thermal Label & Zimmet Form Templates
  db.prepare(`
    CREATE TABLE IF NOT EXISTS label_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        width_mm REAL DEFAULT 70,
        height_mm REAL DEFAULT 35,
        elements_json TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS zimmet_form_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        elements_json TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  console.log("Veritabanı tabloları hazır.");

  // Başlangıç Verilerini Ekle (Seed)
  seedInitialData();
};

const seedInitialData = () => {
    // Rolleri Ekle (Migration)
    db.prepare("UPDATE roles SET name = 'Personel' WHERE name = 'User'").run();
    db.prepare("UPDATE roles SET name = 'Teknisyen' WHERE name = 'HR'").run();

    const roles = [
        { name: 'Admin', description: 'Tam yetkili sistem yöneticisi' },
        { name: 'Teknisyen', description: 'Operasyonel yetkili (Envanter, Sunucu vb.)' },
        { name: 'Personel', description: 'Standart kullanıcı (Sadece kendi zimmetleri/bilgileri)' }
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
        { key: 'm365:edit', module: 'M365 Lisans Yönetimi', desc: 'M365 dağıtım ve lisansları düzenleme / veri analiz etme' },

        // Envanter Yönetimi
        { key: 'asset:view', module: 'Envanter Takip', desc: 'Varlık listesini ve zimmet bilgilerini görüntüleme' },
        { key: 'asset:edit', module: 'Envanter Takip', desc: 'Varlık ekleme, silme, düzenleme ve zimmet işlemlerini yapma' }
    ];

    permissions.forEach(p => {
        db.prepare('INSERT OR IGNORE INTO permissions (permission_key, module, description) VALUES (?, ?, ?)').run(p.key, p.module, p.desc);
    });

    // Seed Asset Categories
    const categories = ['Laptop', 'Desktop PC', 'Monitor', 'Mobile Phone', 'Tablet', 'Printer', 'Network Switch', 'Access Point', 'Other'];
    categories.forEach(cat => {
        db.prepare('INSERT OR IGNORE INTO asset_categories (name) VALUES (?)').run(cat);
    });

    // Seed Asset Brands
    const brands = ['Apple', 'Dell', 'Lenovo', 'HP', 'Samsung', 'Cisco', 'Ubiquiti', 'Huawei', 'Other'];
    brands.forEach(b => {
        db.prepare('INSERT OR IGNORE INTO asset_brands (name) VALUES (?)').run(b);
    });

    // Seed Asset Statuses
    const statuses = [
        'Depoda (Boşta / Atanabilir)',
        'Zimmetlendi (Kullanımda)',
        'Hazırlık Aşamasında (Kurulum / Image)',
        'Yedek Cihaz (Standby / Kit)',
        'Bakımda / Serviste (Tedarikçi Firma)',
        'Arızalı (Tamir Bekliyor)',
        'Kayıp / Çalındı',
        'Hurda (İmha Edilecek)',
        'Arşivlendi (Kullanım Dışı)'
    ];
    statuses.forEach(s => {
        db.prepare('INSERT OR IGNORE INTO asset_statuses (name) VALUES (?)').run(s);
    });

    // Standart Rol İzinlerini Ata
    const techRole = db.prepare("SELECT id FROM roles WHERE name = 'Teknisyen'").get();
    const persRole = db.prepare("SELECT id FROM roles WHERE name = 'Personel'").get();
    
    if (techRole) {
        const techPerms = ['sim:view', 'sim:edit', 'asset:view', 'asset:edit', 'monitoring:view', 'm365:view'];
        techPerms.forEach(pkey => {
            const p = db.prepare('SELECT id FROM permissions WHERE permission_key = ?').get(pkey);
            if (p) db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)').run(techRole.id, p.id);
        });
    }

    if (persRole) {
        const persPerms = []; // Personel rolü varsayılan olarak yetkisiz gelsin, özel yetkiler matris üzerinden verilsin.
        persPerms.forEach(pkey => {
            const p = db.prepare('SELECT id FROM permissions WHERE permission_key = ?').get(pkey);
            if (p) db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)').run(persRole.id, p.id);
        });
    }

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


