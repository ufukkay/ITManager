const { db } = require('../../database/db');

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
        const { name, tax_number, notes } = data;
        
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

        const info = db.prepare("INSERT INTO companies (company_id, name, tax_number, notes) VALUES (?, ?, ?, ?)")
            .run(company_id, name, tax_number, notes);
        return info.lastInsertRowid;
    }

    static async updateCompany(id, data) {
        const { company_id, name, tax_number, notes } = data;
        db.prepare("UPDATE companies SET company_id = ?, name = ?, tax_number = ?, notes = ? WHERE id = ?")
            .run(company_id, name, tax_number, notes, id);
    }

    static async deleteCompany(id) {
        const transaction = db.transaction(() => {
            db.prepare("UPDATE personnel SET company_id = NULL WHERE company_id = ?").run(id);
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
            db.prepare("DELETE FROM cost_centers WHERE id = ?").run(id);
        });
        transaction();
    }

    // --- PERSONNEL ---
    static async getAllPersonnel(filters = {}) {
        let sql = `
            SELECT p.*, c.name as company_name, d.name as department_name, cc.name as cost_center_name 
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
        let { first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status, notes } = data;
        
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

        const info = db.prepare(`
            INSERT INTO personnel (employee_id, first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(employee_id, first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status || 'active', notes);
        return info.lastInsertRowid;
    }

    static async updatePersonnel(id, data) {
        console.log(`[MasterDataService] updatePersonnel: updating id ${id}`, data);
        const { employee_id, first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status, notes } = data;
        db.prepare(`
            UPDATE personnel SET 
                employee_id = ?, first_name = ?, last_name = ?, title = ?, email = ?, phone = ?, 
                company_id = ?, department_id = ?, cost_center_id = ?, 
                hire_date = ?, exit_date = ?, status = ?, notes = ?
            WHERE id = ?
        `).run(employee_id, first_name, last_name, title, email, phone, company_id, department_id, cost_center_id, hire_date, exit_date, status, notes, id);
    }
    static async deletePersonnel(id) {
        const transaction = db.transaction(() => {
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
            const nullStmtM2M    = db.prepare("UPDATE sim_m2m SET personnel_id = NULL WHERE personnel_id = ?");
            const nullStmtVoice  = db.prepare("UPDATE sim_voice SET personnel_id = NULL WHERE personnel_id = ?");
            const nullStmtInv    = db.prepare("UPDATE invoices SET personnel_id = NULL WHERE personnel_id = ?");
            const delStmtM365    = db.prepare("DELETE FROM m365_allocation_users WHERE personnel_id = ?");
            const delStmt        = db.prepare("DELETE FROM personnel WHERE id = ?");
            for (const id of ids) {
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
        const keys = Object.keys(data);
        if (keys.length === 0) return;

        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(data);

        const transaction = db.transaction((ids, vals) => {
            const stmt = db.prepare(`UPDATE personnel SET ${setClause} WHERE id = ?`);
            for (const id of ids) stmt.run(...vals, id);
        });
        transaction(ids, values);
    }

    // --- VEHICLES ---
    static async getAllVehicles() {
        return db.prepare("SELECT * FROM vehicles ORDER BY plate_no ASC").all();
    }

    static async createVehicle(data) {
        const { plate_no, vehicle_type, notes } = data;
        const info = db.prepare("INSERT INTO vehicles (plate_no, vehicle_type, notes) VALUES (?, ?, ?)")
            .run(plate_no, vehicle_type, notes);
        return info.lastInsertRowid;
    }

    static async updateVehicle(id, data) {
        const { plate_no, vehicle_type, notes } = data;
        db.prepare("UPDATE vehicles SET plate_no = ?, vehicle_type = ?, notes = ? WHERE id = ?")
            .run(plate_no, vehicle_type, notes, id);
    }

    static async deleteVehicle(id) {
        db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
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
        db.prepare("DELETE FROM locations WHERE id = ?").run(id);
    }

    // --- OPERATORS ---
    static async getAllOperators() {
        return db.prepare("SELECT * FROM operators ORDER BY name ASC").all();
    }

    static async createOperator(name) {
        const info = db.prepare("INSERT INTO operators (name) VALUES (?)").run(name);
        return info.lastInsertRowid;
    }

    static async updateOperator(id, name) {
        db.prepare("UPDATE operators SET name = ? WHERE id = ?").run(name, id);
    }

    static async deleteOperator(id) {
        db.prepare("DELETE FROM operators WHERE id = ?").run(id);
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
        db.prepare("DELETE FROM packages WHERE id = ?").run(id);
    }

    // --- LICENSES ---
    static async getAllLicenses() {
        return db.prepare("SELECT * FROM m365_licenses ORDER BY name ASC").all();
    }

    static async createLicense(data) {
        const { name, quantity, unit_price, currency } = data;
        const info = db.prepare("INSERT INTO m365_licenses (name, quantity, unit_price, currency) VALUES (?, ?, ?, ?)")
            .run(name, quantity || 0, unit_price || 0, currency || 'USD');
        return info.lastInsertRowid;
    }

    static async updateLicense(id, data) {
        const { name, quantity, unit_price, currency } = data;
        db.prepare("UPDATE m365_licenses SET name = ?, quantity = ?, unit_price = ?, currency = ? WHERE id = ?")
            .run(name, quantity || 0, unit_price || 0, currency || 'USD', id);
    }

    static async deleteLicense(id) {
        db.prepare("DELETE FROM m365_licenses WHERE id = ?").run(id);
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

        const targetTable = tableMap[type] || type;
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

        // En maliyetli 5 personel
        const topPersonnel = db.prepare(`
            SELECT 
                p.id,
                p.first_name || ' ' || p.last_name as name,
                SUM(i.total_amount) as total_amount
            FROM invoices i
            JOIN personnel p ON i.personnel_id = p.id
            GROUP BY p.id
            ORDER BY total_amount DESC
            LIMIT 5
        `).all();

        // Şirket bazlı maliyet dağılımı
        const byCompany = db.prepare(`
            SELECT 
                c.name,
                SUM(i.total_amount) as total_amount
            FROM invoices i
            JOIN companies c ON i.company_id = c.id
            GROUP BY c.id
        `).all();

        return {
            monthlyTrend,
            topPersonnel,
            byCompany
        };
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
        // Dönem, operatör ve dosya ismi aynıysa mükerrer kaydı önlemek için temizle
        db.prepare(`
            DELETE FROM invoices 
            WHERE period = ? AND operator = ? AND source_file = ?
        `).run(data.period, data.operator, data.source_file);

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
}

module.exports = MasterDataService;
