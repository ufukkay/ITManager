const db = require('../../../database/db');

const normalizePhone = (value) => {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? '0' + digits : digits;
};

const sanitizePhoneSQL = (column) => `'0' || substr(replace(replace(replace(replace(replace(COALESCE(${column}, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), -10)`;
const VOICE_PHONE_EXPR = sanitizePhoneSQL('sv.phone_no');
const M2M_PHONE_EXPR = sanitizePhoneSQL('m.phone_no');
const DATA_PHONE_EXPR = sanitizePhoneSQL('d.phone_no');
const PERSONNEL_PHONE_EXPR = sanitizePhoneSQL('p.phone');

function findPersonnelByPhone(phoneNo) {
  const cleanPhone = normalizePhone(phoneNo);
  if (!cleanPhone) return { name: '', costCenter: '', company: '', tariff: '', isMatched: false };
  
  try {
    // 1. Ses hatları tablosunda ara (atanmış bir personel var mı? + Paket bilgisi)
    let res = db.prepare(`
      SELECT 
        p.first_name || ' ' || p.last_name as name, 
        dept.name as department_name, 
        comp.name as company_name, 
        pk.name as package_name
      FROM sim_voice sv
      LEFT JOIN personnel p ON sv.personnel_id = p.id
      LEFT JOIN departments dept ON sv.department_id = dept.id
      LEFT JOIN companies comp ON sv.company_id = comp.id
      LEFT JOIN packages pk ON sv.package_id = pk.id
      WHERE ${VOICE_PHONE_EXPR} = ? LIMIT 1
    `).get(cleanPhone);

    if (res && res.name) {
      return {
        name: res.name || '',
        costCenter: res.department_name || '',
        company: res.company_name || '',
        tariff: res.package_name || '',
        isMatched: true
      };
    }

    // 2. M2M hatlarında ara (Araç plakası + Paket bilgisi)
    res = db.prepare(`
      SELECT 
        m.plate_no as name, 
        comp.name as company_name, 
        pk.name as package_name 
      FROM sim_m2m m
      LEFT JOIN companies comp ON m.operator = comp.name -- Standalone projedeki mantığa göre operator kolonu şirket ismini de tutabiliyordu, ITManager'da company_id var mı bakmalıyım.
      LEFT JOIN packages pk ON m.package_id = pk.id
      WHERE ${M2M_PHONE_EXPR} = ? LIMIT 1
    `).get(cleanPhone);
    // Not: ITManager sim_m2m tablosunda company_id kolonu eklenmiş olabilir, kontrol edelim.
    // db.js satır 241: ALTER TABLE sim_m2m ADD COLUMN vehicle_id ... 
    // db.js satır 243: ALTER TABLE sim_data ADD COLUMN company_id ...
    // m2m'de company_id yok gibi görünüyor ama 'operator' kolonu var.
    
    if (res) return { name: res.name || '', costCenter: res.company_name || '', company: res.company_name || '', tariff: res.package_name || '', isMatched: true };

    // 3. Data hatlarında ara (Lokasyon + Paket bilgisi)
    res = db.prepare(`
      SELECT 
        d.location as name, 
        comp.name as company_name, 
        pk.name as package_name 
      FROM sim_data d 
      LEFT JOIN companies comp ON d.company_id = comp.id
      LEFT JOIN packages pk ON d.package_id = pk.id
      WHERE ${DATA_PHONE_EXPR} = ? LIMIT 1
    `).get(cleanPhone);
    if (res) return { name: res.name || '', costCenter: '', company: res.company_name || '', tariff: res.package_name || '', isMatched: true };

    // 4. Personeller tablosunda direkt telefon numarasıyla ara
    res = db.prepare(`
      SELECT 
        p.first_name || ' ' || p.last_name as name, 
        dept.name as department_name, 
        comp.name as company_name 
      FROM personnel p 
      LEFT JOIN departments dept ON p.department_id = dept.id
      LEFT JOIN companies comp ON p.company_id = comp.id
      WHERE ${PERSONNEL_PHONE_EXPR} = ? LIMIT 1
    `).get(cleanPhone);
    if (res) return { name: res.name, costCenter: res.department_name || '', company: res.company_name || '', tariff: '', isMatched: true };

    return { name: '', costCenter: '', company: '', tariff: '', isMatched: false };
  } catch (e) {
    console.error('Invoice Matcher - Lookup Error:', e);
    return { name: '', costCenter: '', company: '', tariff: '', isMatched: false };
  }
}

module.exports = {
  findPersonnelByPhone,
  normalizePhone
};

