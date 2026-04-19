const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/itmanager.db'), { readonly: true });

const tables = ['companies', 'departments', 'cost_centers', 'personnel', 'sim_m2m', 'sim_voice', 'invoices'];

tables.forEach(table => {
    try {
        const count = db.prepare(`SELECT count(*) as count FROM ${table}`).get().count;
        console.log(`${table}: ${count} records found.`);
    } catch (e) {
        console.log(`${table}: Error or not found - ${e.message}`);
    }
});
