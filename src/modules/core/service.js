const { db } = require('../../database/db');
const { formatPlate } = require('../../utils/formatters');

class MasterDataService {
    // --- COMPANIES ---
    static async getAllCompanies() {
        return db.prepare(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM personnel WHERE company_id = c.id) as personnel_count
            FROM companies c 
            ORDER BY c.name ASC
        `).all();
    }

    static async getCompanyById(id) {
        return db.prepare("SELECT * FROM companies WHERE id = ?").get(id);
    }

    static async createCompany(data) {
        const { name, tax_number, website, notes } = data;
        
        // Mükerrer Kontrolü
        const existingName = db.prepare("SELECT id FROM companies WHERE LOWER(name) = LOWER(?)").get(name);
        if (existingName) throw new Error("Bu isimde bir şirket zaten kayıtlı.");
        
        if (tax_number) {
            const existingTax = db.prepare("SELECT id FROM companies WHERE tax_number = ?").get(tax_number);
            if (existingTax) throw new Error("Bu vergi numarası ile başka bir şirket kayıtlı.");
        }

        // --- Şirket ID (1+) Otomatik Atama ---
        const lastRow = db.prepare("SELECT MAX(company_id) as max_id FROM companies").get();
        const company_id = Math.max(lastRow.max_id || 0, 0) + 1;

        const info = db.prepare("INSERT INTO companies (company_id, name, tax_number, website, notes) VALUES (?, ?, ?, ?, ?)")
            .run(company_id, name, tax_number, website, notes);
        return info.lastInsertRowid;
    }

    static async updateCompany(id, data) {
        const { company_id, name, tax_number, website, notes } = data;
        db.prepare("UPDATE companies SET company_id = ?, name = ?, tax_number = ?, website = ?, notes = ? WHERE id = ?")
            .run(company_id, name, tax_number, website, notes, id);
    }

    static async deleteCompany(id) {
        // assets.company_id NOT NULL kısıtlıdır — bu şirkete bağlı varlık varken silme,
        // "hayalet" şirkete sahip bir varlık bırakır (dangling FK). Önce varlıklar taşınmalı.
        const assetCount = db.prepare("SELECT COUNT(*) as c FROM assets WHERE company_id = ?").get(id).c;
        if (assetCount > 0) {
            throw new Error(`Bu şirkete bağlı ${assetCount} envanter kaydı var. Silmeden önce bu varlıkları başka bir şirkete taşıyın.`);
        }

        const transaction = db.transaction(() => {
            db.prepare("UPDATE personnel SET company_id = NULL WHERE company_id = ?").run(id);
            db.prepare("UPDATE invoices SET company_id = NULL WHERE company_id = ?").run(id);
            db.prepare("UPDATE m365_allocations SET company_id = NULL WHERE company_id = ?").run(id);
            db.prepare("UPDATE hr_requests SET company_id = NULL WHERE company_id = ?").run(id);
            db.prepare("DELETE FROM server_companies WHERE company_id = ?").run(id);
            db.prepare("DELETE FROM companies WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- DEPARTMENTS ---
    static async getAllDepartments() {
        return db.prepare(`
            SELECT d.*, 
                   (SELECT COUNT(*) FROM personnel WHERE department_id = d.id) as personnel_count
            FROM departments d 
            ORDER BY d.name ASC
        `).all();
    }

    static async createDepartment(data) {
        const { name, notes } = data;
        
        // Mükerrer Kontrolü
        const existing = db.prepare("SELECT id FROM departments WHERE LOWER(name) = LOWER(?)").get(name);
        if (existing) throw new Error("Bu isimde bir departman zaten kayıtlı.");

        // --- Departman ID (100+) Otomatik Atama ---
        const lastRow = db.prepare("SELECT MAX(dept_id) as max_id FROM departments").get();
        const dept_id = Math.max(lastRow.max_id || 99, 99) + 1;

        const info = db.prepare("INSERT INTO departments (dept_id, name, notes) VALUES (?, ?, ?)")
            .run(dept_id, name, notes);
        return info.lastInsertRowid;
    }

    static async updateDepartment(id, data) {
        const { dept_id, name, notes } = data;
        db.prepare("UPDATE departments SET dept_id = ?, name = ?, notes = ? WHERE id = ?")
            .run(dept_id, name, notes, id);
    }

    static async deleteDepartment(id) {
        const transaction = db.transaction(() => {
            db.prepare("UPDATE personnel SET department_id = NULL WHERE department_id = ?").run(id);
            db.prepare("UPDATE assets SET department_id = NULL WHERE department_id = ?").run(id);
            db.prepare("UPDATE hr_requests SET department_id = NULL WHERE department_id = ?").run(id);
            db.prepare("UPDATE helpdesk_tickets SET related_dep_id = NULL WHERE related_dep_id = ?").run(id);
            db.prepare("DELETE FROM departments WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- COST CENTERS ---
    static async getAllCostCenters() {
        return db.prepare(`
            SELECT cc.*, 
                   (SELECT COUNT(*) FROM personnel WHERE cost_center_id = cc.id) as personnel_count
            FROM cost_centers cc 
            ORDER BY cc.name ASC
        `).all();
    }

    static async createCostCenter(data) {
        const { code, name, notes } = data;

        // Mükerrer Kontrolü
        const existingCode = db.prepare("SELECT id FROM cost_centers WHERE LOWER(code) = LOWER(?)").get(code);
        if (existingCode) throw new Error("Bu kod ile bir masraf yeri zaten kayıtlı.");

        const info = db.prepare("INSERT INTO cost_centers (code, name, notes) VALUES (?, ?, ?)")
            .run(code, name, notes);
        return info.lastInsertRowid;
    }

    static async updateCostCenter(id, data) {
        const { code, name, notes } = data;
        db.prepare("UPDATE cost_centers SET code = ?, name = ?, notes = ? WHERE id = ?")
            .run(code, name, notes, id);
    }

    static async deleteCostCenter(id) {
        const transaction = db.transaction(() => {
            db.prepare("UPDATE personnel SET cost_center_id = NULL WHERE cost_center_id = ?").run(id);
            db.prepare("UPDATE invoices SET cost_center_id = NULL WHERE cost_center_id = ?").run(id);
            db.prepare("UPDATE assets SET cost_center_id = NULL WHERE cost_center_id = ?").run(id);
            db.prepare("DELETE FROM cost_centers WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- PERSONNEL ---
    static async getAllPersonnel(filters = {}) {
        let sql = `
            SELECT p.*, c.name as company_name, d.name as department_name, cc.name as cost_center_name,
                   (SELECT COUNT(*) FROM users WHERE personnel_id = p.id) as has_account
            FROM personnel p
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN cost_centers cc ON p.cost_center_id = cc.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.company_id) {
            sql += " AND p.company_id = ?";
            params.push(filters.company_id);
        }
        if (filters.status) {
            sql += " AND p.status = ?";
            params.push(filters.status);
        }
        if (filters.search) {
            sql += " AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ?)";
            const s = `%${filters.search}%`;
            params.push(s, s, s);
        }

        sql += " ORDER BY p.first_name, p.last_name ASC";
        return db.prepare(sql).all(...params);
    }

    static async createPersonnel(data) {
        let { first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status, notes, has_account, role_id, custom_permissions, entra_id, source } = data;
        
        // --- Mükerrer Kayıt Kontrolü ---
        // 1. Email varsa kontrol et
        if (email && email.trim()) {
            const existing = db.prepare("SELECT id FROM personnel WHERE email = ?").get(email);
            if (existing) throw new Error("Bu e-posta adresi ile kayıtlı bir personel zaten var.");
        }
        
        // 2. Ad + Soyad + Şirket kombosu kontrolü
        const existingName = db.prepare(`
            SELECT id FROM personnel 
            WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?) AND company_id = ?
        `).get(first_name, last_name, company_id);
        
        if (existingName) throw new Error("Bu isim ve şirket ile bir personel zaten kayıtlı.");

        // --- Sicil No (1000+) Otomatik Atama ---
        const lastRow = db.prepare("SELECT MAX(employee_id) as max_id FROM personnel").get();
        const employee_id = Math.max(lastRow.max_id || 999, 999) + 1;

        const transaction = db.transaction(() => {
            const info = db.prepare(`
                INSERT INTO personnel (employee_id, first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status, notes, entra_id, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(employee_id, first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status || 'active', notes, entra_id || null, source || 'manual');
            const personnelId = info.lastInsertRowid;

            if (has_account) {
                if (!email) throw new Error("Sistem hesabı oluşturmak için e-posta gereklidir.");
                
                const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
                if (existingUser) throw new Error("Bu e-posta ile zaten bir sistem hesabı mevcut.");
                
                const bcrypt = require('bcryptjs');
                const userPass = (data.password && data.password.trim()) ? data.password.trim() : require('crypto').randomBytes(32).toString('hex');
                const hashedPass = bcrypt.hashSync(userPass, 10);
                const username = email.split('@')[0];

                const userInfo = db.prepare(`
                    INSERT INTO users (email, username, password, full_name, role_id, personnel_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(email, username, hashedPass, `${first_name} ${last_name}`, role_id || null, personnelId);
                const userId = userInfo.lastInsertRowid;

                if (custom_permissions && Array.isArray(custom_permissions)) {
                    const insertPerm = db.prepare('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)');
                    for (const pId of custom_permissions) insertPerm.run(userId, pId);
                }

                // Send welcome email (asynchronous)
                try {
                    const MailerService = require('../../services/MailerService');
                    MailerService.sendPasswordResetEmail(email, `${first_name} ${last_name}`, true, userId).catch(err => {
                        console.error("Welcome email failed:", err);
                    });
                } catch (e) {
                    console.error("Mailer setup error:", e);
                }
            }

            return personnelId;
        });

        return transaction();
    }

    static async updatePersonnel(id, data) {
        const { employee_id, first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status, notes, has_account, role_id, custom_permissions, entra_id, source } = data;
        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE personnel SET 
                    employee_id = ?, first_name = ?, last_name = ?, title = ?, email = ?, phone = ?, 
                    company_id = ?, department_id = ?, cost_center_id = ?, 
                    hire_date = ?, exit_date = ?, status = ?, notes = ?,
                    entra_id = ?, source = ?
                WHERE id = ?
            `).run(employee_id, first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status, notes, entra_id || null, source || 'manual', id);

            const user = db.prepare("SELECT id FROM users WHERE personnel_id = ?").get(id);

            if (has_account) {
                if (!email) throw new Error("Sistem hesabı oluşturmak veya güncellemek için e-posta gereklidir.");
                
                const bcrypt = require('bcryptjs');
                let userId = null;
                if (user) {
                    if (data.password && data.password.trim()) {
                        const hashedPass = bcrypt.hashSync(data.password.trim(), 10);
                        db.prepare("UPDATE users SET email = ?, full_name = ?, role_id = ?, password = ? WHERE id = ?").run(email, `${first_name} ${last_name}`, role_id || null, hashedPass, user.id);
                    } else {
                        db.prepare("UPDATE users SET email = ?, full_name = ?, role_id = ? WHERE id = ?").run(email, `${first_name} ${last_name}`, role_id || null, user.id);
                    }
                    userId = user.id;
                } else {
                    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
                    if (existingUser) throw new Error("Bu e-posta ile zaten bir sistem hesabı mevcut.");
                    
                    const userPass = (data.password && data.password.trim()) ? data.password.trim() : require('crypto').randomBytes(32).toString('hex');
                    const hashedPass = bcrypt.hashSync(userPass, 10);
                    const username = email.split('@')[0];

                    const userInfo = db.prepare(`
                        INSERT INTO users (email, username, password, full_name, role_id, personnel_id)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(email, username, hashedPass, `${first_name} ${last_name}`, role_id || null, id);
                    userId = userInfo.lastInsertRowid;

                    try {
                        const MailerService = require('../../services/MailerService');
                        MailerService.sendPasswordResetEmail(email, `${first_name} ${last_name}`, true, userId).catch(err => {
                            console.error("Welcome email failed:", err);
                        });
                    } catch (e) {
                        console.error("Mailer setup error:", e);
                    }
                }

                if (custom_permissions && Array.isArray(custom_permissions)) {
                    db.prepare("DELETE FROM user_permissions WHERE user_id = ?").run(userId);
                    const insertPerm = db.prepare('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)');
                    for (const pId of custom_permissions) insertPerm.run(userId, pId);
                }
            } else {
                if (user) {
                    db.prepare("DELETE FROM user_permissions WHERE user_id = ?").run(user.id);
                    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
                }
            }
        });
        transaction();
    }
    static async deletePersonnel(id) {
        const transaction = db.transaction(() => {
            db.prepare("UPDATE users SET personnel_id = NULL WHERE personnel_id = ?").run(id);
            db.prepare("UPDATE assets SET personnel_id = NULL WHERE personnel_id = ?").run(id);
            db.prepare("UPDATE helpdesk_tickets SET personnel_id = NULL WHERE personnel_id = ?").run(id);
            db.prepare("UPDATE sim_m2m SET personnel_id = NULL WHERE personnel_id = ?").run(id);
            db.prepare("UPDATE sim_voice SET personnel_id = NULL WHERE personnel_id = ?").run(id);
            db.prepare("UPDATE invoices SET personnel_id = NULL WHERE personnel_id = ?").run(id);
            db.prepare("DELETE FROM m365_allocation_users WHERE personnel_id = ?").run(id);
            db.prepare("DELETE FROM personnel WHERE id = ?").run(id);
        });
        transaction();
    }

    static async bulkDeletePersonnel(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        const transaction = db.transaction((ids) => {
            const nullStmtUsers   = db.prepare("UPDATE users SET personnel_id = NULL WHERE personnel_id = ?");
            const nullStmtAssets  = db.prepare("UPDATE assets SET personnel_id = NULL WHERE personnel_id = ?");
            const nullStmtTickets = db.prepare("UPDATE helpdesk_tickets SET personnel_id = NULL WHERE personnel_id = ?");
            const nullStmtM2M     = db.prepare("UPDATE sim_m2m SET personnel_id = NULL WHERE personnel_id = ?");
            const nullStmtVoice   = db.prepare("UPDATE sim_voice SET personnel_id = NULL WHERE personnel_id = ?");
            const nullStmtInv     = db.prepare("UPDATE invoices SET personnel_id = NULL WHERE personnel_id = ?");
            const delStmtM365     = db.prepare("DELETE FROM m365_allocation_users WHERE personnel_id = ?");
            const delStmt         = db.prepare("DELETE FROM personnel WHERE id = ?");
            for (const id of ids) {
                nullStmtUsers.run(id);
                nullStmtAssets.run(id);
                nullStmtTickets.run(id);
                nullStmtM2M.run(id);
                nullStmtVoice.run(id);
                nullStmtInv.run(id);
                delStmtM365.run(id);
                delStmt.run(id);
            }
        });
        transaction(ids);
    }

    static async bulkUpdatePersonnel(ids, data) {
        if (!Array.isArray(ids) || ids.length === 0) return;

        const ALLOWED_COLUMNS = ['company_id', 'department_id', 'cost_center_id', 'status', 'title', 'title_tr', 'title_en'];
        const keys = Object.keys(data || {}).filter(k => ALLOWED_COLUMNS.includes(k));
        if (keys.length === 0) return;

        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k]);

        const transaction = db.transaction((ids, vals) => {
            const stmt = db.prepare(`UPDATE personnel SET ${setClause} WHERE id = ?`);
            for (const id of ids) stmt.run(...vals, id);
        });
        transaction(ids, values);
    }

    // --- PERSONNEL USER ACCOUNTS ---
    static async getPersonnelUser(personnelId) {
        return db.prepare(`
            SELECT u.id, u.email, u.username, u.full_name, u.role_id, r.name as role_name 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.personnel_id = ?
        `).get(personnelId);
    }

    static async createPersonnelUser(personnelId) {
        const personnel = db.prepare("SELECT * FROM personnel WHERE id = ?").get(personnelId);
        if (!personnel) throw new Error("Personel bulunamadı.");
        if (!personnel.email) throw new Error("Personelin e-posta adresi eksik. Sistem hesabı oluşturmak için e-posta gereklidir.");

        // Kullanıcı var mı kontrol et
        const existingUser = db.prepare("SELECT id FROM users WHERE email = ? OR personnel_id = ?").get(personnel.email, personnelId);
        if (existingUser) throw new Error("Bu personel için veya bu e-posta ile zaten bir sistem hesabı mevcut.");

        // Varsayılan rol: 'User' (id=2) veya bulamazsa ilk rol
        let role = db.prepare("SELECT id FROM roles WHERE name = 'User'").get();
        if (!role) {
            role = db.prepare("SELECT id FROM roles ORDER BY id ASC LIMIT 1").get();
        }

        const bcrypt = require('bcryptjs');
        const crypto = require('crypto');
        
        // Rastgele 32 karakterlik güvenli bir şifre oluştur (kullanıcı bunu bilemeyecek, şifremi unuttum ile kendi şifresini belirleyecek)
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPass = bcrypt.hashSync(randomPassword, 10);
        
        // Kullanıcı adını e-postadan çıkar
        const username = personnel.email.split('@')[0];

        const info = db.prepare(`
            INSERT INTO users (email, username, password, full_name, role_id, personnel_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(personnel.email, username, hashedPass, `${personnel.first_name} ${personnel.last_name}`, role ? role.id : null, personnelId);
        
        // Hoşgeldin & Şifre belirleme mailini gönder
        try {
            const MailerService = require('../../services/MailerService');
            // asenkron olarak gönder (bekletmeye gerek yok)
            MailerService.sendPasswordResetEmail(personnel.email, `${personnel.first_name} ${personnel.last_name}`, true, info.lastInsertRowid).catch(err => {
                console.error("Welcome email failed:", err);
            });
        } catch (e) {
            console.error("Mailer setup error:", e);
        }
        
        return info.lastInsertRowid;
    }

    // --- VEHICLES ---
    static async getAllVehicles() {
        return db.prepare(`
            SELECT v.*, 
                   p.first_name || ' ' || p.last_name as personnel_name 
            FROM vehicles v 
            LEFT JOIN personnel p ON v.personnel_id = p.id 
            ORDER BY v.plate_no ASC
        `).all();
    }

    static async createVehicle(data) {
        const { vehicle_type, notes, personnel_id } = data;
        const info = db.prepare("INSERT INTO vehicles (plate_no, vehicle_type, notes, personnel_id) VALUES (?, ?, ?, ?)")
            .run(formatPlate(data.plate_no), vehicle_type, notes, personnel_id || null);
        return info.lastInsertRowid;
    }

    static async updateVehicle(id, data) {
        const { vehicle_type, notes, personnel_id } = data;
        const pid = personnel_id ? Number(personnel_id) : null;

        let costCenterId = null;
        if (pid) {
            const p = db.prepare('SELECT cost_center_id FROM personnel WHERE id = ?').get(pid);
            costCenterId = p ? p.cost_center_id : null;
        }

        const transaction = db.transaction(() => {
            db.prepare("UPDATE vehicles SET plate_no = ?, vehicle_type = ?, notes = ?, personnel_id = ? WHERE id = ?")
                .run(formatPlate(data.plate_no), vehicle_type, notes, pid, id);

            if (pid) {
                db.prepare(`
                    UPDATE invoices
                    SET personnel_id = ?, cost_center_id = COALESCE(?, cost_center_id)
                    WHERE phone_no IN (
                        SELECT phone_no FROM assets WHERE vehicle_id = ? AND phone_no IS NOT NULL
                    )
                `).run(pid, costCenterId, id);
            } else {
                db.prepare(`
                    UPDATE invoices
                    SET personnel_id = NULL
                    WHERE phone_no IN (
                        SELECT phone_no FROM assets WHERE vehicle_id = ? AND phone_no IS NOT NULL
                    )
                `).run(id);
            }
        });
        transaction();
    }

    static async deleteVehicle(id) {
        const transaction = db.transaction(() => {
            // updateVehicle'daki şoför-kaldırma mantığıyla tutarlı: araca bağlı SIM hatlarının
            // faturalarındaki personel ataması da temizlenmeli, aksi halde artık var olmayan
            // bir araca bağlı personel maliyeti raporlarda görünmeye devam eder.
            db.prepare(`
                UPDATE invoices
                SET personnel_id = NULL
                WHERE phone_no IN (
                    SELECT phone_no FROM assets WHERE vehicle_id = ? AND phone_no IS NOT NULL
                )
            `).run(id);
            db.prepare("UPDATE assets SET vehicle_id = NULL WHERE vehicle_id = ?").run(id);
            db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- LOCATIONS ---
    static async getAllLocations() {
        return db.prepare("SELECT * FROM locations ORDER BY name ASC").all();
    }

    static async createLocation(data) {
        const { name, address, notes } = data;
        const info = db.prepare("INSERT INTO locations (name, address, notes) VALUES (?, ?, ?)")
            .run(name, address, notes);
        return info.lastInsertRowid;
    }

    static async updateLocation(id, data) {
        const { name, address, notes } = data;
        db.prepare("UPDATE locations SET name = ?, address = ?, notes = ? WHERE id = ?")
            .run(name, address, notes, id);
    }

    static async deleteLocation(id) {
        const transaction = db.transaction(() => {
            db.prepare("UPDATE assets SET location_id = NULL WHERE location_id = ?").run(id);
            db.prepare("UPDATE hr_requests SET location_id = NULL WHERE location_id = ?").run(id);
            db.prepare("DELETE FROM locations WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- OPERATORS ---
    static async getAllOperators() {
        return db.prepare("SELECT * FROM operators ORDER BY name ASC").all();
    }

    // Her operatörün Envanter tarafında kendi Markası ve bu marka altında 3 SIM hat tipi
    // modeli (Ses/Data/M2M Hattı) olmasını sağlar — SIM kartı eklerken Marka=operatör,
    // Model=hat tipi seçilebilsin diye (bkz. simcardtracking/services/simAssetService.js).
    static syncOperatorBrandModels(name) {
        db.prepare('INSERT OR IGNORE INTO asset_brands (name) VALUES (?)').run(name);
        const brand = db.prepare('SELECT id FROM asset_brands WHERE name = ?').get(name);
        const category = db.prepare("SELECT id FROM asset_categories WHERE name = 'SIM Kart'").get();
        if (!brand || !category) return;
        ['Ses Hattı', 'Data Hattı', 'M2M Hattı'].forEach(modelName => {
            db.prepare('INSERT OR IGNORE INTO asset_models (name, category_id, brand_id) VALUES (?, ?, ?)')
                .run(modelName, category.id, brand.id);
        });
    }

    static async createOperator(name) {
        const info = db.prepare("INSERT INTO operators (name) VALUES (?)").run(name);
        MasterDataService.syncOperatorBrandModels(name);
        return info.lastInsertRowid;
    }

    static async updateOperator(id, name) {
        db.prepare("UPDATE operators SET name = ? WHERE id = ?").run(name, id);
        MasterDataService.syncOperatorBrandModels(name);
    }

    static async deleteOperator(id) {
        // packages.operator_id NOT NULL kısıtlıdır — bu operatöre bağlı paket varken silme,
        // "hayalet" operatöre sahip bir paket bırakır. Önce paketler silinmeli/taşınmalı.
        const packageCount = db.prepare("SELECT COUNT(*) as c FROM packages WHERE operator_id = ?").get(id).c;
        if (packageCount > 0) {
            throw new Error(`Bu operatöre bağlı ${packageCount} paket var. Silmeden önce bu paketleri silin veya başka bir operatöre taşıyın.`);
        }

        const transaction = db.transaction(() => {
            db.prepare("UPDATE assets SET operator_id = NULL WHERE operator_id = ?").run(id);
            db.prepare("DELETE FROM operators WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- PACKAGES ---
    static async getAllPackages(type = null) {
        if (type) {
            return db.prepare("SELECT p.*, o.name as operator_name FROM packages p JOIN operators o ON p.operator_id = o.id WHERE p.type = ? ORDER BY p.name ASC").all(type);
        }
        return db.prepare("SELECT p.*, o.name as operator_name FROM packages p JOIN operators o ON p.operator_id = o.id ORDER BY p.name ASC").all();
    }

    static async createPackage(data) {
        const { name, type, operator_id, price, data_limit, sms_limit, minutes_limit, features } = data;
        const info = db.prepare(`
            INSERT INTO packages (name, type, operator_id, price, data_limit, sms_limit, minutes_limit, features)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, type, operator_id, price, data_limit, sms_limit, minutes_limit, features);
        return info.lastInsertRowid;
    }

    static async updatePackage(id, data) {
        const { name, type, operator_id, price, data_limit, sms_limit, minutes_limit, features } = data;
        db.prepare(`
            UPDATE packages SET 
                name = ?, type = ?, operator_id = ?, price = ?, 
                data_limit = ?, sms_limit = ?, minutes_limit = ?, features = ?
            WHERE id = ?
        `).run(name, type, operator_id, price, data_limit, sms_limit, minutes_limit, features, id);
    }

    static async deletePackage(id) {
        const transaction = db.transaction(() => {
            db.prepare("UPDATE assets SET package_id = NULL WHERE package_id = ?").run(id);
            db.prepare("DELETE FROM packages WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- LICENSES ---
    static async getAllLicenses() {
        return db.prepare("SELECT * FROM m365_licenses ORDER BY name ASC").all();
    }

    static async createLicense(data) {
        const { name, category, quantity, unit_price, currency } = data;
        const info = db.prepare("INSERT INTO m365_licenses (name, category, quantity, unit_price, currency) VALUES (?, ?, ?, ?, ?)")
            .run(name, category || 'M365', quantity || 0, unit_price || 0, currency || 'USD');
        return info.lastInsertRowid;
    }

    static async updateLicense(id, data) {
        const { name, category, quantity, unit_price, currency } = data;
        db.prepare("UPDATE m365_licenses SET name = ?, category = ?, quantity = ?, unit_price = ?, currency = ? WHERE id = ?")
            .run(name, category || 'M365', quantity || 0, unit_price || 0, currency || 'USD', id);
    }

    static async deleteLicense(id) {
        const transaction = db.transaction(() => {
            // Bir lisans-atama kaydı ("allocation") lisans olmadan anlamsızdır — null'lamak yerine
            // kaskad siliyoruz (önce ona bağlı kullanıcı atamaları, sonra allocation'ın kendisi).
            const allocationIds = db.prepare("SELECT id FROM m365_allocations WHERE license_id = ?").all(id).map(a => a.id);
            if (allocationIds.length > 0) {
                const placeholders = allocationIds.map(() => '?').join(',');
                db.prepare(`DELETE FROM m365_allocation_users WHERE allocation_id IN (${placeholders})`).run(...allocationIds);
                db.prepare(`DELETE FROM m365_allocations WHERE id IN (${placeholders})`).run(...allocationIds);
            }
            db.prepare("DELETE FROM m365_licenses WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- SERVERS ---
    static async getAllServers(type = null) {
        let sql = 'SELECT * FROM servers';
        const params = [];
        if (type) {
            sql += ' WHERE type = ?';
            params.push(type);
        }
        sql += ' ORDER BY name ASC';
        const servers = db.prepare(sql).all(...params);

        // Şirket atamalarını ekle
        return servers.map(srv => {
            const companies = db.prepare(`
                SELECT sc.company_id, c.name, sc.share_ratio 
                FROM server_companies sc
                JOIN companies c ON sc.company_id = c.id
                WHERE sc.server_id = ?
            `).all(srv.id);
            return { ...srv, companies };
        });
    }

    static async createServer(data) {
        const { name, ip_address, os_version, description, type, companies } = data;
        const transaction = db.transaction(() => {
            const info = db.prepare(`
                INSERT INTO servers (name, ip_address, os_version, description, type, status) 
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET 
                    ip_address = excluded.ip_address, 
                    os_version = excluded.os_version,
                    description = excluded.description,
                    type = excluded.type,
                    status = excluded.status
            `).run(name, ip_address, os_version || 'Windows Server', description || '', type || 'cloud', data.status || 'online');

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
        return transaction();
    }

    static async updateServer(id, data) {
        const { name, ip_address, os_version, description, type, status, companies } = data;
        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE servers SET 
                    name = ?, ip_address = ?, os_version = ?, 
                    description = ?, type = ?, status = ?
                WHERE id = ?
            `).run(name, ip_address, os_version, description, type, status || 'online', id);

            if (companies && Array.isArray(companies)) {
                db.prepare('DELETE FROM server_companies WHERE server_id = ?').run(id);
                const insertShare = db.prepare('INSERT INTO server_companies (server_id, company_id, share_ratio) VALUES (?, ?, ?)');
                for (const comp of companies) {
                    insertShare.run(id, comp.id, comp.share_ratio || (100 / companies.length));
                }
            }
        });
        transaction();
    }

    static async deleteServer(id) {
        db.prepare("DELETE FROM server_companies WHERE server_id = ?").run(id);
        db.prepare("DELETE FROM servers WHERE id = ?").run(id);
    }

    // --- IMPACT ANALYSIS ---
    static async getDeleteImpact(type, id) {
        const tableMap = {
            'companies': 'companies',
            'departments': 'departments',
            'cost-centers': 'cost_centers',
            'personnel': 'personnel',
            'vehicles': 'vehicles',
            'locations': 'locations',
            'operators': 'operators',
            'packages': 'packages',
            'licenses': 'm365_licenses',
            'servers': 'servers',
            'hr-requests': 'hr_requests'
        };

        const identifyingColumns = {
            'companies': 'name',
            'departments': 'name',
            'cost_centers': "code || ' - ' || name",
            'personnel': "first_name || ' ' || last_name",
            'vehicles': 'plate_no',
            'locations': 'name',
            'operators': 'name',
            'packages': 'name',
            'm365_licenses': 'name',
            'servers': "name || ' (' || ip_address || ')'",
            'sim_m2m': 'phone_no',
            'sim_data': 'phone_no',
            'sim_voice': 'phone_no',
            'invoices': "period || ' (' || phone_no || ')'",
            'hr_requests': "full_name || ' (' || type || ')'",
            'm365_allocations': 'id',
            'm365_allocation_users': 'user_name',
            'server_companies': 'share_ratio'
        };

        const tableDocNames = {
            'sim_m2m': 'M2M Hatları',
            'sim_voice': 'Ses Hatları',
            'sim_data': 'Data Hatları',
            'invoices': 'Faturalar',
            'personnel': 'Personeller',
            'hr_requests': 'İK Talepleri',
            'm365_allocation_users': 'M365 Kullanıcı Atamaları',
            'server_companies': 'Sunucu Maliyet Paylaşımları',
            'packages': 'Hizmet Paketleri',
            'vehicles': 'Araçlar',
            'locations': 'Lokasyonlar'
        };

        // type, URL path parametresinden geliyor (istemci kontrollü) — bilinmeyen bir değeri
        // sessizce ham tablo adı olarak kullanmak yerine (targetTable hiçbir tabloyla eşleşmeyip
        // yanıltıcı şekilde "etki yok" dönerdi) burada reddediyoruz.
        if (!tableMap[type]) {
            throw new Error(`Bilinmeyen kayıt tipi: ${type}`);
        }
        const targetTable = tableMap[type];
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'").all();
        const results = [];

        for (const t of tables) {
            if (t.name === targetTable) continue;

            const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all();
            const relevantFKs = foreignKeys.filter(fk => fk.table === targetTable);

            for (const fk of relevantFKs) {
                const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name} WHERE ${fk.from} = ?`).get(id).count;
                
                if (count > 0) {
                    const labelColumn = identifyingColumns[t.name] || 'id';
                    const samples = db.prepare(`SELECT ${labelColumn} as label FROM ${t.name} WHERE ${fk.from} = ? LIMIT 5`).all(id);
                    
                    results.push({
                        table: tableDocNames[t.name] || t.name.charAt(0).toUpperCase() + t.name.slice(1),
                        count: count,
                        samples: samples.map(s => s.label)
                    });
                }
            }
        }

        return results;
    }

    // --- FINANCIAL INTELLIGENCE ---
    static async getPersonnelFinancialHistory(personnelId) {
        // Aylık bazda tüm maliyetleri topla (GSM + M365)
        return db.prepare(`
            SELECT 
                period,
                SUM(total_amount) as total_amount,
                SUM(CASE WHEN invoice_type = 'gsm' THEN total_amount ELSE 0 END) as gsm_amount,
                SUM(CASE WHEN invoice_type = 'm365' THEN total_amount ELSE 0 END) as m365_amount,
                GROUP_CONCAT(DISTINCT operator) as categories
            FROM invoices
            WHERE personnel_id = ?
            GROUP BY period
            ORDER BY period DESC
            LIMIT 12
        `).all(personnelId);
    }

    static async getGlobalFinancialStats() {
        // Son 12 ayın toplam maliyet trendi
        const monthlyTrend = db.prepare(`
            SELECT 
                period,
                SUM(total_amount) as amount,
                SUM(CASE WHEN invoice_type = 'gsm' THEN total_amount ELSE 0 END) as gsm,
                SUM(CASE WHEN invoice_type = 'm365' THEN total_amount ELSE 0 END) as m365
            FROM invoices
            GROUP BY period
            ORDER BY period ASC
            LIMIT 24
        `).all();

        // En maliyetli 10 personel (Detaylı)
        const topPersonnel = db.prepare(`
            SELECT 
                p.id,
                COALESCE(p.first_name || ' ' || p.last_name, 'Eşleşmemiş Kayıtlar') as name,
                COALESCE(d.name, 'Genel') as department_name,
                COALESCE(c.name, 'Tanımsız Şirket') as company_name,
                SUM(i.total_amount) as total_amount,
                SUM(CASE WHEN i.invoice_type = 'gsm' THEN i.total_amount ELSE 0 END) as gsm_total,
                SUM(CASE WHEN i.invoice_type = 'm365' THEN i.total_amount ELSE 0 END) as m365_total
            FROM invoices i
            LEFT JOIN personnel p ON i.personnel_id = p.id
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN companies c ON p.company_id = c.id
            GROUP BY i.personnel_id
            ORDER BY total_amount DESC
            LIMIT 10
        `).all();

        // Şirket bazlı maliyet dağılımı
        const byCompany = db.prepare(`
            SELECT 
                COALESCE(c.name, 'Eşleşmemiş/Bilinmeyen') as name,
                SUM(i.total_amount) as total_amount,
                COUNT(DISTINCT i.personnel_id) as personnel_count
            FROM invoices i
            LEFT JOIN companies c ON i.company_id = c.id
            GROUP BY i.company_id
        `).all();

        // Hizmet Tipi Kırılımı
        const byServiceType = db.prepare(`
            SELECT 
                invoice_type,
                operator,
                SUM(total_amount) as amount
            FROM invoices
            GROUP BY invoice_type, operator
            ORDER BY amount DESC
        `).all();

        // Masraf Merkezi Kırılımı
        const byCostCenter = db.prepare(`
            SELECT 
                COALESCE(cc.name, 'Merkez/Tanımsız') as name,
                SUM(i.total_amount) as amount
            FROM invoices i
            LEFT JOIN cost_centers cc ON i.cost_center_id = cc.id
            GROUP BY i.cost_center_id
            ORDER BY amount DESC
        `).all();

        return {
            monthlyTrend,
            topPersonnel,
            byCompany,
            byServiceType,
            byCostCenter
        };
    }

    // --- REPORT QUERIES ---

    static async getAvailablePeriods() {
        return db.prepare(`
            SELECT DISTINCT period
            FROM invoices
            ORDER BY period DESC
        `).all().map(r => r.period);
    }

    // Rapor ekranındaki personel detay modalı için — sim-takip modülüne (sim:view yetkisi)
    // bağımlı olmadan, reports ile aynı masterdata:view yetkisiyle erişilebilir salt-okunur liste.
    static async getPersonnelInvoices(personnelId, filters = {}) {
        const whereClauses = ['i.personnel_id = ?'];
        const params = [personnelId];

        if (filters.period) {
            whereClauses.push('i.period = ?');
            params.push(filters.period);
        }

        return db.prepare(`
            SELECT i.id, i.period, i.invoice_type, i.operator, i.phone_no, i.tariff, i.total_amount
            FROM invoices i
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY i.period DESC, i.total_amount DESC
        `).all(...params);
    }

    static async getReportByPersonnel(filters = {}) {
        // Dönem/operatör faturaya ait filtrelerdir — JOIN koşuluna eklenir ki faturasız
        // personel de LEFT JOIN sayesinde 0 tutarla listede kalsın (WHERE'e koyulsaydı
        // eşleşmeyen personel LEFT JOIN'e rağmen sonuçtan tamamen düşerdi).
        let joinClauses = ['i.personnel_id = p.id'];
        let whereClauses = ['1=1'];
        const joinParams = [];
        const whereParams = [];

        if (filters.period) {
            joinClauses.push('i.period = ?');
            joinParams.push(filters.period);
        }
        if (filters.operator) {
            joinClauses.push('i.operator = ?');
            joinParams.push(filters.operator);
        }
        if (filters.company_id) {
            whereClauses.push('p.company_id = ?');
            whereParams.push(filters.company_id);
        }
        if (filters.cost_center_id) {
            whereClauses.push('p.cost_center_id = ?');
            whereParams.push(filters.cost_center_id);
        }
        if (filters.department_id) {
            whereClauses.push('p.department_id = ?');
            whereParams.push(filters.department_id);
        }

        const joinSQL = joinClauses.join(' AND ');
        const whereSQL = whereClauses.join(' AND ');
        const params = [...joinParams, ...whereParams];

        // Personel bazlı rapor — tüm personel listelenir (faturası olmayanlar da 0 tutarla görünür)
        const rows = db.prepare(`
            SELECT 
                p.id as personnel_id,
                p.first_name || ' ' || p.last_name as personnel_name,
                p.phone as personnel_phone,
                COALESCE(c.name, 'Tanımsız Şirket') as company_name,
                c.id as company_id,
                COALESCE(cc.code || '-' || cc.name, 'Tanımsız') as cost_center_name,
                cc.id as cost_center_id,
                COALESCE(d.name, '') as department_name,
                SUM(CASE WHEN i.invoice_type = 'gsm' THEN i.total_amount ELSE 0 END) as gsm_total,
                SUM(CASE WHEN i.invoice_type = 'm365' THEN i.total_amount ELSE 0 END) as m365_total,
                SUM(i.total_amount) as grand_total,
                GROUP_CONCAT(DISTINCT i.operator) as operators,
                COUNT(DISTINCT i.id) as invoice_count,
                (SELECT COALESCE(SUM(ml.unit_price), 0)
                    FROM m365_allocation_users mau
                    JOIN m365_allocations ma ON mau.allocation_id = ma.id
                    JOIN m365_licenses ml ON ma.license_id = ml.id
                    WHERE mau.personnel_id = p.id) as m365_live_license_total,
                (SELECT COALESCE(SUM(
                    CASE 
                        WHEN a.purchase_price > 0 
                             AND a.purchase_date IS NOT NULL
                             AND a.lifetime_months > 0
                             AND (
                               (CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', a.purchase_date) AS INTEGER)) * 12 +
                               (CAST(strftime('%m', 'now') AS INTEGER) - CAST(strftime('%m', a.purchase_date) AS INTEGER))
                             ) < a.lifetime_months
                        THEN ROUND(CAST(a.purchase_price AS REAL) / a.lifetime_months, 2)
                        ELSE 0
                    END
                ), 0)
                FROM assets a
                WHERE a.personnel_id = p.id AND a.status_id NOT IN (SELECT id FROM asset_statuses WHERE name IN ('Hurda','Kayıp','Depo'))
                ) as amortisman_total
            FROM personnel p
            LEFT JOIN invoices i ON ${joinSQL}
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN cost_centers cc ON p.cost_center_id = cc.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE ${whereSQL}
            GROUP BY p.id
            ORDER BY grand_total DESC
        `).all(...params);

        // Toplamlar
        const totals = db.prepare(`
            SELECT
                COUNT(DISTINCT p.id) as total_personnel,
                SUM(CASE WHEN i.invoice_type = 'gsm' THEN i.total_amount ELSE 0 END) as total_gsm,
                SUM(CASE WHEN i.invoice_type = 'm365' THEN i.total_amount ELSE 0 END) as total_m365,
                SUM(i.total_amount) as total_amount,
                COUNT(DISTINCT i.id) as total_invoices
            FROM personnel p
            LEFT JOIN invoices i ON ${joinSQL}
            WHERE ${whereSQL}
        `).get(...params);

        // Canlı M365 lisans maliyeti — faturalanan m365_total'dan bağımsız, Azure atamasından hesaplanan
        // güncel durum (dönem/operatör filtresi uygulanmaz, sadece şirket/masraf merkezi filtrelenir).
        const liveWhere = ['1=1'];
        const liveParams = [];
        if (filters.company_id) { liveWhere.push('p.company_id = ?'); liveParams.push(filters.company_id); }
        if (filters.cost_center_id) { liveWhere.push('p.cost_center_id = ?'); liveParams.push(filters.cost_center_id); }
        if (filters.department_id) { liveWhere.push('p.department_id = ?'); liveParams.push(filters.department_id); }
        const liveTotal = db.prepare(`
            SELECT COALESCE(SUM(ml.unit_price), 0) as total
            FROM m365_allocation_users mau
            JOIN m365_allocations ma ON mau.allocation_id = ma.id
            JOIN m365_licenses ml ON ma.license_id = ml.id
            JOIN personnel p ON mau.personnel_id = p.id
            WHERE ${liveWhere.join(' AND ')}
        `).get(...liveParams);
        totals.total_m365_live = parseFloat((liveTotal.total || 0).toFixed(2));

        return { rows, totals };
    }

    static async getReportByService(filters = {}) {
        // clause+param'ı bir arada tutuyoruz ki "period hariç" filtrelemesi (monthlyTrend)
        // clause sırasından bağımsız ve güvenilir olsun (params dizisini index'e göre
        // filtrelemek, filtre sırası değişince yanlış parametreyi çıkarma riski taşıyordu).
        const conditions = [];
        if (filters.period) conditions.push({ clause: 'i.period = ?', param: filters.period, isPeriod: true });
        if (filters.company_id) conditions.push({ clause: 'p.company_id = ?', param: filters.company_id });
        if (filters.operator) conditions.push({ clause: 'i.operator = ?', param: filters.operator });
        if (filters.cost_center_id) conditions.push({ clause: 'p.cost_center_id = ?', param: filters.cost_center_id });
        if (filters.department_id) conditions.push({ clause: 'p.department_id = ?', param: filters.department_id });

        const whereSQL = ['1=1', ...conditions.map(c => c.clause)].join(' AND ');
        const params = conditions.map(c => c.param);

        // Hizmet tipi (GSM/M365) ve operatör kırılımı
        const byType = db.prepare(`
            SELECT 
                i.invoice_type,
                i.operator,
                SUM(i.total_amount) as total_amount,
                SUM(i.amount) as net_amount,
                SUM(i.tax_kdv) as total_kdv,
                SUM(i.tax_oiv) as total_oiv,
                COUNT(DISTINCT i.id) as invoice_count,
                COUNT(DISTINCT i.personnel_id) as personnel_count
            FROM invoices i
            LEFT JOIN personnel p ON i.personnel_id = p.id
            WHERE ${whereSQL}
            GROUP BY i.invoice_type, i.operator
            ORDER BY total_amount DESC
        `).all(...params);

        // Masraf merkezi kırılımı (personelden gelir)
        const byCostCenter = db.prepare(`
            SELECT
                COALESCE(cc.code || '-' || cc.name, 'Tanımsız') as cost_center_name,
                cc.id as cost_center_id,
                SUM(CASE WHEN i.invoice_type = 'gsm' THEN i.total_amount ELSE 0 END) as gsm_total,
                SUM(i.total_amount) as grand_total,
                COUNT(DISTINCT i.personnel_id) as personnel_count,
                (SELECT COALESCE(SUM(ml.unit_price), 0)
                    FROM m365_allocation_users mau
                    JOIN m365_allocations ma ON mau.allocation_id = ma.id
                    JOIN m365_licenses ml ON ma.license_id = ml.id
                    JOIN personnel p2 ON mau.personnel_id = p2.id
                    WHERE p2.cost_center_id = cc.id) as m365_live_license_total
            FROM invoices i
            LEFT JOIN personnel p ON i.personnel_id = p.id
            LEFT JOIN cost_centers cc ON p.cost_center_id = cc.id
            WHERE ${whereSQL}
            GROUP BY cc.id
            ORDER BY grand_total DESC
        `).all(...params);

        // Dönem trendi — period filtresi hariç tüm diğer filtreler uygulanır (aksi halde
        // tek bir dönem seçiliyken trend grafiği anlamsız kalırdı).
        const trendConditions = conditions.filter(c => !c.isPeriod);
        const trendWhereSQL = ['1=1', ...trendConditions.map(c => c.clause)].join(' AND ');
        const monthlyTrend = db.prepare(`
            SELECT
                i.period,
                SUM(CASE WHEN i.invoice_type = 'gsm' THEN i.total_amount ELSE 0 END) as gsm,
                SUM(CASE WHEN i.invoice_type = 'm365' THEN i.total_amount ELSE 0 END) as m365,
                SUM(i.total_amount) as total
            FROM invoices i
            LEFT JOIN personnel p ON i.personnel_id = p.id
            WHERE ${trendWhereSQL}
            GROUP BY i.period
            ORDER BY i.period ASC
        `).all(...trendConditions.map(c => c.param));

        // Toplamlar
        const totals = db.prepare(`
            SELECT
                SUM(i.total_amount) as total_amount,
                SUM(i.amount) as net_amount,
                SUM(i.tax_kdv) as total_kdv,
                SUM(i.tax_oiv) as total_oiv,
                COUNT(DISTINCT i.personnel_id) as total_personnel
            FROM invoices i
            LEFT JOIN personnel p ON i.personnel_id = p.id
            WHERE ${whereSQL}
        `).get(...params);

        // Canlı Microsoft lisansları (Azure atamasından, USD) — lisans planı bazında kırılım.
        // Faturaya değil güncel atamaya dayandığından dönem/operatör filtresi uygulanmaz.
        const liveWhere = ['1=1'];
        const liveParams = [];
        if (filters.company_id) { liveWhere.push('p.company_id = ?'); liveParams.push(filters.company_id); }
        if (filters.cost_center_id) { liveWhere.push('p.cost_center_id = ?'); liveParams.push(filters.cost_center_id); }
        if (filters.department_id) { liveWhere.push('p.department_id = ?'); liveParams.push(filters.department_id); }
        const m365Live = db.prepare(`
            SELECT
                ml.id as license_id,
                ml.name as license_name,
                ml.currency,
                ml.unit_price,
                COUNT(mau.id) as seat_count,
                SUM(COALESCE(ml.unit_price, 0)) as monthly_cost
            FROM m365_allocation_users mau
            JOIN m365_allocations ma ON mau.allocation_id = ma.id
            JOIN m365_licenses ml ON ma.license_id = ml.id
            JOIN personnel p ON mau.personnel_id = p.id
            WHERE ${liveWhere.join(' AND ')}
            GROUP BY ml.id
            ORDER BY monthly_cost DESC
        `).all(...liveParams);
        const m365LiveTotal = m365Live.reduce((sum, r) => sum + (r.monthly_cost || 0), 0);

        // Amortisman (aylık, TL) — zimmetli fiziksel varlıklar, kategori bazında kırılım.
        // SIM Kart hariç (o zaten aylık faturayla geliyor, amortismana tabi değil).
        const amortisman = db.prepare(`
            SELECT
                ac.id as category_id,
                ac.name as category_name,
                COUNT(*) as asset_count,
                SUM(CASE
                    WHEN a.purchase_price > 0
                         AND a.purchase_date IS NOT NULL
                         AND a.lifetime_months > 0
                         AND (
                           (CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', a.purchase_date) AS INTEGER)) * 12 +
                           (CAST(strftime('%m', 'now') AS INTEGER) - CAST(strftime('%m', a.purchase_date) AS INTEGER))
                         ) < a.lifetime_months
                    THEN ROUND(CAST(a.purchase_price AS REAL) / a.lifetime_months, 2)
                    ELSE 0
                END) as monthly_amortisman
            FROM assets a
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_categories ac ON am.category_id = ac.id
            JOIN personnel p ON a.personnel_id = p.id
            WHERE ac.name != 'SIM Kart'
              AND a.status_id NOT IN (SELECT id FROM asset_statuses WHERE name IN ('Hurda','Kayıp','Depo'))
              AND ${liveWhere.join(' AND ')}
            GROUP BY ac.id
            ORDER BY monthly_amortisman DESC
        `).all(...liveParams);
        const amortismanTotal = amortisman.reduce((sum, r) => sum + (r.monthly_amortisman || 0), 0);

        return {
            byType, byCostCenter, monthlyTrend, totals,
            m365Live, m365LiveTotal: parseFloat(m365LiveTotal.toFixed(2)),
            amortisman, amortismanTotal: parseFloat(amortismanTotal.toFixed(2))
        };
    }

    static async getReportByCompany(filters = {}) {
        let whereClauses = ['1=1'];
        const params = [];

        if (filters.period) {
            whereClauses.push('i.period = ?');
            params.push(filters.period);
        }
        if (filters.company_id) {
            whereClauses.push('p.company_id = ?');
            params.push(filters.company_id);
        }
        if (filters.operator) {
            whereClauses.push('i.operator = ?');
            params.push(filters.operator);
        }
        if (filters.cost_center_id) {
            whereClauses.push('p.cost_center_id = ?');
            params.push(filters.cost_center_id);
        }
        if (filters.department_id) {
            whereClauses.push('p.department_id = ?');
            params.push(filters.department_id);
        }

        const whereSQL = whereClauses.join(' AND ');

        // Şirket bazlı toplam rapor
        const byCompany = db.prepare(`
            SELECT 
                COALESCE(c.name, 'Tanımsız Şirket') as company_name,
                c.id as company_id,
                SUM(CASE WHEN i.invoice_type = 'gsm' THEN i.total_amount ELSE 0 END) as gsm_total,
                SUM(CASE WHEN i.invoice_type = 'm365' THEN i.total_amount ELSE 0 END) as m365_total,
                SUM(i.total_amount) as grand_total,
                COUNT(DISTINCT i.personnel_id) as personnel_count,
                COUNT(DISTINCT i.id) as invoice_count,
                (SELECT COALESCE(SUM(ml.unit_price), 0)
                    FROM m365_allocation_users mau
                    JOIN m365_allocations ma ON mau.allocation_id = ma.id
                    JOIN m365_licenses ml ON ma.license_id = ml.id
                    WHERE ma.company_id = p.company_id) as m365_live_license_total
            FROM invoices i
            LEFT JOIN personnel p ON i.personnel_id = p.id
            LEFT JOIN companies c ON p.company_id = c.id
            WHERE ${whereSQL}
            GROUP BY p.company_id
            ORDER BY grand_total DESC
        `).all(...params);

        // Seçili şirket detayı — masraf merkezi kırılımı
        let costCenterDetail = [];
        if (filters.company_id) {
            costCenterDetail = db.prepare(`
                SELECT
                    COALESCE(cc.code || '-' || cc.name, 'Tanımsız') as cost_center_name,
                    cc.id as cost_center_id,
                    SUM(CASE WHEN i.invoice_type = 'gsm' THEN i.total_amount ELSE 0 END) as gsm_total,
                    SUM(i.total_amount) as grand_total,
                    COUNT(DISTINCT i.personnel_id) as personnel_count,
                    (SELECT COALESCE(SUM(ml.unit_price), 0)
                        FROM m365_allocation_users mau
                        JOIN m365_allocations ma ON mau.allocation_id = ma.id
                        JOIN m365_licenses ml ON ma.license_id = ml.id
                        JOIN personnel p2 ON mau.personnel_id = p2.id
                        WHERE p2.cost_center_id = cc.id) as m365_live_license_total
                FROM invoices i
                LEFT JOIN personnel p ON i.personnel_id = p.id
                LEFT JOIN cost_centers cc ON p.cost_center_id = cc.id
                WHERE ${whereSQL}
                GROUP BY cc.id
                ORDER BY grand_total DESC
            `).all(...params);
        }

        // Dönem karşılaştırma — tüm dönemler, şirket bazlı
        const trendParams = [];
        let trendWhere = '1=1';
        if (filters.company_id) {
            trendWhere = 'p.company_id = ?';
            trendParams.push(filters.company_id);
        }
        if (filters.operator) {
            trendWhere += ' AND i.operator = ?';
            trendParams.push(filters.operator);
        }
        if (filters.cost_center_id) {
            trendWhere += ' AND p.cost_center_id = ?';
            trendParams.push(filters.cost_center_id);
        }
        if (filters.department_id) {
            trendWhere += ' AND p.department_id = ?';
            trendParams.push(filters.department_id);
        }

        const monthlyTrend = db.prepare(`
            SELECT 
                i.period,
                SUM(CASE WHEN i.invoice_type = 'gsm' THEN i.total_amount ELSE 0 END) as gsm,
                SUM(CASE WHEN i.invoice_type = 'm365' THEN i.total_amount ELSE 0 END) as m365,
                SUM(i.total_amount) as total
            FROM invoices i
            LEFT JOIN personnel p ON i.personnel_id = p.id
            WHERE ${trendWhere}
            GROUP BY i.period
            ORDER BY i.period ASC
        `).all(...trendParams);

        // Genel toplam
        const totals = db.prepare(`
            SELECT
                SUM(i.total_amount) as total_amount,
                COUNT(DISTINCT p.company_id) as total_companies,
                COUNT(DISTINCT i.personnel_id) as total_personnel
            FROM invoices i
            LEFT JOIN personnel p ON i.personnel_id = p.id
            WHERE ${whereSQL}
        `).get(...params);

        // Canlı M365 lisans maliyeti (USD) — personel raporundaki aynı mantık, dönem/operatör
        // filtresi uygulanmaz (faturaya değil güncel Azure atamasına dayanır).
        const liveWhere = ['1=1'];
        const liveParams = [];
        if (filters.company_id) { liveWhere.push('p.company_id = ?'); liveParams.push(filters.company_id); }
        if (filters.cost_center_id) { liveWhere.push('p.cost_center_id = ?'); liveParams.push(filters.cost_center_id); }
        if (filters.department_id) { liveWhere.push('p.department_id = ?'); liveParams.push(filters.department_id); }
        const liveTotal = db.prepare(`
            SELECT COALESCE(SUM(ml.unit_price), 0) as total
            FROM m365_allocation_users mau
            JOIN m365_allocations ma ON mau.allocation_id = ma.id
            JOIN m365_licenses ml ON ma.license_id = ml.id
            JOIN personnel p ON mau.personnel_id = p.id
            WHERE ${liveWhere.join(' AND ')}
        `).get(...liveParams);
        totals.total_m365_live = parseFloat((liveTotal.total || 0).toFixed(2));

        return { byCompany, costCenterDetail, monthlyTrend, totals };
    }

    // --- HELPERS FOR MATCHING ---
    static findPersonnelByEmail(email) {
        if (!email) return null;
        return db.prepare(`
            SELECT p.id, p.company_id, p.cost_center_id, p.first_name || ' ' || p.last_name as full_name
            FROM personnel p
            WHERE LOWER(p.email) = LOWER(?)
        `).get(email);
    }

    static findPersonnelByPhone(phone) {
        if (!phone) return null;
        // Normalize phone for lookup (last 10 digits)
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        return db.prepare(`
            SELECT p.id, p.company_id, p.cost_center_id, p.first_name || ' ' || p.last_name as full_name
            FROM personnel p
            WHERE phone LIKE ?
        `).get(`%${cleanPhone}%`);
    }

    static async insertInvoiceRecord(data) {
        const stmt = db.prepare(`
            INSERT INTO invoices (
                invoice_type, operator, period, phone_no, 
                personnel_id, company_id, cost_center_id, 
                source_file, tariff, amount, tax_kdv, tax_oiv, 
                total_amount, is_matched
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            data.invoice_type || 'gsm',
            data.operator,
            data.period,
            data.phone_no,
            data.personnel_id,
            data.company_id,
            data.cost_center_id,
            data.source_file,
            data.tariff,
            data.amount,
            data.tax_kdv,
            data.tax_oiv,
            data.total_amount,
            data.is_matched
        );
    }

    // --- LICENSE ALLOCATIONS ---
    static async getAllAllocations() {
        return db.prepare(`
            SELECT 
                mau.id,
                p.first_name || ' ' || p.last_name as personnel_name,
                c.name as company_name,
                ml.name as license_name,
                ml.id as license_id,
                p.id as personnel_id
            FROM m365_allocation_users mau
            JOIN personnel p ON mau.personnel_id = p.id
            JOIN m365_allocations ma ON mau.allocation_id = ma.id
            JOIN m365_licenses ml ON ma.license_id = ml.id
            JOIN companies c ON p.company_id = c.id
            ORDER BY personnel_name ASC
        `).all();
    }

    // --- PERSONNEL BENEFITS (Aylik Destekler) ---
    static async getPersonnelBenefits(personnelId) {
        return db.prepare("SELECT * FROM personnel_benefits WHERE personnel_id = ? ORDER BY id ASC").all(personnelId);
    }

    static async createPersonnelBenefit(personnelId, data) {
        const { benefit_type, amount, notes } = data;
        const info = db.prepare("INSERT INTO personnel_benefits (personnel_id, benefit_type, amount, notes) VALUES (?, ?, ?, ?)")
            .run(personnelId, benefit_type, amount || 0, notes || null);
        return info.lastInsertRowid;
    }

    static async updatePersonnelBenefit(id, data) {
        const { benefit_type, amount, notes } = data;
        db.prepare("UPDATE personnel_benefits SET benefit_type = ?, amount = ?, notes = ? WHERE id = ?")
            .run(benefit_type, amount || 0, notes || null, id);
    }

    static async deletePersonnelBenefit(id) {
        db.prepare("DELETE FROM personnel_benefits WHERE id = ?").run(id);
    }

    static async getPersonnelBenefitsReport() {
        return db.prepare(`
            SELECT pb.*, p.first_name, p.last_name, p.employee_id,
                   c.name as company_name, d.name as department_name
            FROM personnel_benefits pb
            JOIN personnel p ON pb.personnel_id = p.id
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.status = 'active'
            ORDER BY c.name, p.first_name
        `).all();
    }
}

module.exports = MasterDataService;
