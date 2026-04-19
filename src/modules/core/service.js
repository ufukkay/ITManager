const { db } = require('../../database/db');

class MasterDataService {
    // --- COMPANIES ---
    static async getAllCompanies() {
        return db.prepare("SELECT * FROM companies ORDER BY name ASC").all();
    }

    static async getCompanyById(id) {
        return db.prepare("SELECT * FROM companies WHERE id = ?").get(id);
    }

    static async createCompany(data) {
        const { name, tax_number, notes } = data;
        const info = db.prepare("INSERT INTO companies (name, tax_number, notes) VALUES (?, ?, ?)")
            .run(name, tax_number, notes);
        return info.lastInsertRowid;
    }

    static async updateCompany(id, data) {
        const { name, tax_number, notes } = data;
        db.prepare("UPDATE companies SET name = ?, tax_number = ?, notes = ? WHERE id = ?")
            .run(name, tax_number, notes, id);
    }

    static async deleteCompany(id) {
        db.prepare("DELETE FROM companies WHERE id = ?").run(id);
    }

    // --- DEPARTMENTS ---
    static async getAllDepartments(companyId = null) {
        if (companyId) {
            return db.prepare("SELECT * FROM departments WHERE company_id = ? ORDER BY name ASC").all(companyId);
        }
        return db.prepare("SELECT * FROM departments ORDER BY name ASC").all();
    }

    static async createDepartment(data) {
        const { name, company_id, notes } = data;
        const info = db.prepare("INSERT INTO departments (name, company_id, notes) VALUES (?, ?, ?)")
            .run(name, company_id, notes);
        return info.lastInsertRowid;
    }

    static async updateDepartment(id, data) {
        const { name, company_id, notes } = data;
        db.prepare("UPDATE departments SET name = ?, company_id = ?, notes = ? WHERE id = ?")
            .run(name, company_id, notes, id);
    }

    static async deleteDepartment(id) {
        db.prepare("DELETE FROM departments WHERE id = ?").run(id);
    }

    // --- COST CENTERS ---
    static async getAllCostCenters(companyId = null) {
        if (companyId) {
            return db.prepare("SELECT * FROM cost_centers WHERE company_id = ? ORDER BY name ASC").all(companyId);
        }
        return db.prepare("SELECT * FROM cost_centers ORDER BY name ASC").all();
    }

    static async createCostCenter(data) {
        const { code, name, company_id } = data;
        const info = db.prepare("INSERT INTO cost_centers (code, name, company_id) VALUES (?, ?, ?)")
            .run(code, name, company_id);
        return info.lastInsertRowid;
    }

    static async updateCostCenter(id, data) {
        const { code, name, company_id } = data;
        db.prepare("UPDATE cost_centers SET code = ?, name = ?, company_id = ? WHERE id = ?")
            .run(code, name, company_id, id);
    }

    static async deleteCostCenter(id) {
        db.prepare("DELETE FROM cost_centers WHERE id = ?").run(id);
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
        const { first_name, last_name, email, phone, company_id, department_id, cost_center_id, notes } = data;
        const info = db.prepare(`
            INSERT INTO personnel (first_name, last_name, email, phone, company_id, department_id, cost_center_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(first_name, last_name, email, phone, company_id, department_id, cost_center_id, notes);
        return info.lastInsertRowid;
    }

    static async updatePersonnel(id, data) {
        const { first_name, last_name, email, phone, company_id, department_id, cost_center_id, status, notes } = data;
        db.prepare(`
            UPDATE personnel SET 
                first_name = ?, last_name = ?, email = ?, phone = ?, 
                company_id = ?, department_id = ?, cost_center_id = ?, 
                status = ?, notes = ?
            WHERE id = ?
        `).run(first_name, last_name, email, phone, company_id, department_id, cost_center_id, status, notes, id);
    }
    static async deletePersonnel(id) {
        db.prepare("DELETE FROM personnel WHERE id = ?").run(id);
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
        return transaction();
    }

    static async updateServer(id, data) {
        const { name, ip_address, os_version, description, type, companies } = data;
        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE servers SET name = ?, ip_address = ?, os_version = ?, description = ?, type = ?
                WHERE id = ?
            `).run(name, ip_address, os_version, description, type, id);

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
}

module.exports = MasterDataService;
