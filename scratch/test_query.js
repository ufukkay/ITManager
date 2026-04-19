const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve('C:/Users/ufuk.kaya/Desktop/Projeler/ITManager/data/itmanager.db');
const db = new Database(dbPath);

try {
    const query = `
        SELECT 
          sim_m2m.*, 
          p.name as package_name, p.price as cost_try, p.data_limit as quota_gb,
          v.plate_no, v.vehicle_type,
          c.name as company_name
        FROM sim_m2m 
        LEFT JOIN packages p ON sim_m2m.package_id = p.id 
        LEFT JOIN vehicles v ON sim_m2m.vehicle_id = v.id
        LEFT JOIN companies c ON sim_m2m.company_id = c.id
        WHERE 1=1
        ORDER BY sim_m2m.id DESC
    `;
    const results = db.prepare(query).all();
    console.log('Success! Found ' + results.length + ' rows.');
    if (results.length > 0) console.log('First row:', results[0]);
} catch (err) {
    console.error('SQL Error:', err.message);
}
