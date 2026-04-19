const { db } = require('../src/database/db');

try {
    console.log('Starting migration for sim_m2m...');
    
    // Add personnel_id
    try {
        db.prepare('ALTER TABLE sim_m2m ADD COLUMN personnel_id INTEGER REFERENCES personnel(id)').run();
        console.log('Added personnel_id column.');
    } catch (e) {
        console.log('personnel_id already exists or error: ' + e.message);
    }
    
    // Add department_id
    try {
        db.prepare('ALTER TABLE sim_m2m ADD COLUMN department_id INTEGER REFERENCES departments(id)').run();
        console.log('Added department_id column.');
    } catch (e) {
        console.log('department_id already exists or error: ' + e.message);
    }
    
    // Add last_usage_date
    try {
        db.prepare('ALTER TABLE sim_m2m ADD COLUMN last_usage_date TEXT').run();
        console.log('Added last_usage_date column.');
    } catch (e) {
        console.log('last_usage_date already exists or error: ' + e.message);
    }
    
    console.log('Migration completed successfully.');
} catch (err) {
    console.error('Migration failed:', err);
}
