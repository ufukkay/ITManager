const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Pathlar
const targetDbPath = path.join(__dirname, '../data/itmanager.db');
const sourceDbPath = 'c:/Users/ufuk.kaya/Downloads/simcard_backup_2026-04-19.db.crdownload';

// Bağlantılar
const targetDb = new Database(targetDbPath);
const sourceDb = new Database(sourceDbPath, { readonly: true });

console.log("Migration başlatılıyor...");

// Veritabanı fonksiyonları
const run = (db, sql, params = []) => db.prepare(sql).run(params);
const get = (db, sql, params = []) => db.prepare(sql).get(params);
const all = (db, sql, params = []) => db.prepare(sql).all(params);

// Yardımcı Mapler
const companyMap = new Map(); // name -> id
const deptMap = new Map();    // name -> id
const costCenterMap = new Map(); // name -> id
const personnelMap = new Map(); // full_name -> id

function migrate() {
    targetDb.transaction(() => {
        // 1. Şirketleri Taşı (Companies)
        console.log("Şirketler taşınıyor...");
        
        // M365 Şirketlerinden başla
        const m365Companies = all(targetDb, "SELECT id, name FROM m365_companies");
        for (const comp of m365Companies) {
            const existing = get(targetDb, "SELECT id FROM companies WHERE name = ?", [comp.name]);
            if (!existing) {
                const result = targetDb.prepare("INSERT INTO companies (name) VALUES (?)").run(comp.name);
                companyMap.set(comp.name, result.lastInsertRowid);
            } else {
                companyMap.set(comp.name, existing.id);
            }
        }

        // Kaynak DB'deki şirketleri bul (Metin bazlı verilerden)
        // Personel, sim_m2m, sim_data içindeki 'company' kolonlarını topla
        const sourceCompanies = new Set();
        all(sourceDb, "SELECT DISTINCT company FROM personnel WHERE company IS NOT NULL").forEach(r => sourceCompanies.add(r.company));
        all(sourceDb, "SELECT DISTINCT company FROM sim_m2m WHERE company IS NOT NULL").forEach(r => sourceCompanies.add(r.company));
        all(sourceDb, "SELECT DISTINCT company FROM sim_data WHERE company IS NOT NULL").forEach(r => sourceCompanies.add(r.company));
        all(sourceDb, "SELECT DISTINCT assigned_company FROM sim_voice WHERE assigned_company IS NOT NULL").forEach(r => sourceCompanies.add(r.assigned_company));
        
        for (const name of sourceCompanies) {
            if (!companyMap.has(name)) {
                const existing = get(targetDb, "SELECT id FROM companies WHERE name = ?", [name]);
                if (!existing) {
                    const result = targetDb.prepare("INSERT INTO companies (name) VALUES (?)").run(name);
                    companyMap.set(name, result.lastInsertRowid);
                } else {
                    companyMap.set(name, existing.id);
                }
            }
        }

        // 2. Departmanları Taşı
        console.log("Departmanlar taşınıyor...");
        const sourceDepts = all(sourceDb, "SELECT DISTINCT department FROM personnel WHERE department IS NOT NULL");
        for (const d of sourceDepts) {
            const existing = get(targetDb, "SELECT id FROM departments WHERE name = ?", [d.department]);
            if (!existing) {
                const result = targetDb.prepare("INSERT INTO departments (name) VALUES (?)").run(d.department);
                deptMap.set(d.department, result.lastInsertRowid);
            } else {
                deptMap.set(d.department, existing.id);
            }
        }

        // 3. Masraf Yerlerini Taşı
        console.log("Masraf yerleri taşınıyor...");
        const sourceCostCenters = new Set();
        all(sourceDb, "SELECT DISTINCT cost_center FROM personnel WHERE cost_center IS NOT NULL").forEach(r => sourceCostCenters.add(r.cost_center));
        all(sourceDb, "SELECT DISTINCT cost_center FROM sim_voice WHERE cost_center IS NOT NULL").forEach(r => sourceCostCenters.add(r.cost_center));
        
        for (const cc of sourceCostCenters) {
            const existing = get(targetDb, "SELECT id FROM cost_centers WHERE name = ?", [cc]);
            if (!existing) {
                const result = targetDb.prepare("INSERT INTO cost_centers (name) VALUES (?)").run(cc);
                costCenterMap.set(cc, result.lastInsertRowid);
            } else {
                costCenterMap.set(cc, existing.id);
            }
        }

        // 4. Personel Taşı
        console.log("Personel listesi taşınıyor...");
        const sourcePersonnel = all(sourceDb, "SELECT * FROM personnel");
        for (const p of sourcePersonnel) {
            const cId = p.company ? companyMap.get(p.company) : null;
            const dId = p.department ? deptMap.get(p.department) : null;
            const ccId = p.cost_center ? costCenterMap.get(p.cost_center) : null;

            const existing = get(targetDb, "SELECT id FROM personnel WHERE first_name = ? AND last_name = ?", [p.first_name, p.last_name]);
            if (!existing) {
                const result = targetDb.prepare(`
                    INSERT INTO personnel (first_name, last_name, phone, company_id, department_id, cost_center_id, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(p.first_name, p.last_name, p.phone, cId, dId, ccId, p.notes);
                personnelMap.set(`${p.first_name} ${p.last_name}`, result.lastInsertRowid);
            } else {
                personnelMap.set(`${p.first_name} ${p.last_name}`, existing.id);
            }
        }

        // 5. SIM Verilerini Taşı
        console.log("SIM Operatörleri ve Paketleri taşınıyor...");
        const ops = all(sourceDb, "SELECT * FROM operators");
        for (const op of ops) {
            run(targetDb, "INSERT OR IGNORE INTO operators (id, name, created_at) VALUES (?, ?, ?)", [op.id, op.name, op.created_at]);
        }
        
        const packs = all(sourceDb, "SELECT * FROM packages");
        for (const pk of packs) {
            run(targetDb, "INSERT OR IGNORE INTO packages (id, name, type, operator_id, price, data_limit, sms_limit, minutes_limit, features, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                [pk.id, pk.name, pk.type, pk.operator_id, pk.price, pk.data_limit, pk.sms_limit, pk.minutes_limit, pk.features, pk.created_at]);
        }

        console.log("SIM M2M taşınıyor...");
        const m2ms = all(sourceDb, "SELECT * FROM sim_m2m");
        for (const m of m2ms) {
            const cId = m.company ? companyMap.get(m.company) : null;
            run(targetDb, `INSERT OR IGNORE INTO sim_m2m (iccid, phone_no, operator, status, plate_no, vehicle_type, notes, package_id, company_id, created_at, updated_at) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [m.iccid, m.phone_no, m.operator, m.status, m.plate_no, m.vehicle_type, m.notes, m.package_id, cId, m.created_at, m.updated_at]);
        }

        console.log("SIM Voice taşınıyor...");
        const voices = all(sourceDb, "SELECT * FROM sim_voice");
        for (const v of voices) {
            const pId = v.assigned_to ? personnelMap.get(v.assigned_to) : null;
            run(targetDb, `INSERT OR IGNORE INTO sim_voice (iccid, phone_no, operator, status, personnel_id, notes, package_id, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [v.iccid, v.phone_no, v.operator, v.status, pId, v.notes, v.package_id, v.created_at, v.updated_at]);
        }

        console.log("Faturalar taşınıyor...");
        const invs = all(sourceDb, "SELECT * FROM invoices");
        for (const i of invs) {
            const pId = i.personnel_name ? personnelMap.get(i.personnel_name) : null;
            const cId = i.company_name ? companyMap.get(i.company_name) : null;
            const ccId = i.cost_center ? costCenterMap.get(i.cost_center) : null;

            run(targetDb, `INSERT INTO invoices (operator, period, phone_no, personnel_id, cost_center_id, company_id, source_file, tariff, amount, tax_kdv, tax_oiv, total_amount, is_matched, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [i.operator, i.period, i.phone_no, pId, ccId, cId, i.source_file, i.tariff, i.amount, i.tax_kdv, i.tax_oiv, i.total_amount, i.is_matched, i.created_at]);
        }

    })();
    console.log("Migration başarıyla tamamlandı!");
}

migrate();
