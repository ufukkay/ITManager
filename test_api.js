const db = require('./src/modules/simcardtracking/database/db');

try {
  const query = `
    SELECT sim_voice.*, 
           p.name as package_name, 
           (pers.first_name || ' ' || pers.last_name) as personnel_name,
           comp.name as company_name,
           dept.name as department_name
    FROM sim_voice 
    LEFT JOIN packages p ON sim_voice.package_id = p.id 
    LEFT JOIN personnel pers ON sim_voice.personnel_id = pers.id
    LEFT JOIN companies comp ON sim_voice.company_id = comp.id
    LEFT JOIN departments dept ON sim_voice.department_id = dept.id
    ORDER BY sim_voice.id DESC
  `;
  const result = db.prepare(query).all();
  console.log('SUCCESS:', result.length, 'records found.');
  console.log('FIRST RECORD:', result[0] || 'NONE');
} catch (e) {
  console.error('FAILURE:', e.message);
}
