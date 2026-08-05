const { db } = require('../../../database/db');

const normalizePhone = (value) => {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? '0' + digits : digits;
};

const sanitizePhoneSQL = (column) => `'0' || substr(replace(replace(replace(replace(replace(COALESCE(${column}, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), -10)`;
const ASSET_PHONE_EXPR = sanitizePhoneSQL('a.phone_no');
const PERSONNEL_PHONE_EXPR = sanitizePhoneSQL('p.phone');

// SIM hatları artık `assets` tablosunda (bkz. simAssetService.js). Eşleşme önceliği eskisiyle
// aynı: Ses hattı (personel) → M2M hattı (araç) → Data hattı (lokasyon) → doğrudan personel telefonu.
function findPersonnelByPhone(phoneNo) {
  const cleanPhone = normalizePhone(phoneNo);
  if (!cleanPhone) return { name: '', costCenter: '', company: '', tariff: '', isMatched: false };

  try {
    // 1. Ses hattında ara (atanmış bir personel var mı? + Paket bilgisi)
    let res = db.prepare(`
      SELECT
        p.id as personnel_id,
        p.first_name || ' ' || p.last_name as name,
        cc.id as cost_center_id,
        cc.name as cost_center_name,
        comp.id as company_id,
        comp.name as company_name,
        pk.name as package_name
      FROM assets a
      JOIN asset_models am ON a.model_id = am.id
      LEFT JOIN personnel p ON a.personnel_id = p.id
      LEFT JOIN cost_centers cc ON p.cost_center_id = cc.id
      LEFT JOIN companies comp ON p.company_id = comp.id
      LEFT JOIN packages pk ON a.package_id = pk.id
      WHERE am.name = 'Ses Hattı' AND ${ASSET_PHONE_EXPR} = ? LIMIT 1
    `).get(cleanPhone);

    if (res && res.name) {
      return {
        personnel_id: res.personnel_id,
        company_id: res.company_id,
        cost_center_id: res.cost_center_id,
        name: res.name || '',
        costCenter: res.cost_center_name || '',
        company: res.company_name || '',
        tariff: res.package_name || '',
        isMatched: true
      };
    }

    // 2. M2M hattında ara (Araç plakası + Paket bilgisi)
    res = db.prepare(`
      SELECT
        v.plate_no as name,
        comp.id as company_id,
        comp.name as company_name,
        pk.name as package_name
      FROM assets a
      JOIN asset_models am ON a.model_id = am.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN companies comp ON a.company_id = comp.id
      LEFT JOIN packages pk ON a.package_id = pk.id
      WHERE am.name = 'M2M Hattı' AND ${ASSET_PHONE_EXPR} = ? LIMIT 1
    `).get(cleanPhone);

    if (res) return {
        personnel_id: null,
        company_id: res.company_id,
        cost_center_id: null,
        name: res.name || '',
        costCenter: res.company_name || '',
        company: res.company_name || '',
        tariff: res.package_name || '',
        isMatched: true
    };

    // 3. Data hattında ara (Lokasyon + Paket bilgisi)
    res = db.prepare(`
      SELECT
        l.name as name,
        comp.id as company_id,
        comp.name as company_name,
        pk.name as package_name
      FROM assets a
      JOIN asset_models am ON a.model_id = am.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN companies comp ON a.company_id = comp.id
      LEFT JOIN packages pk ON a.package_id = pk.id
      WHERE am.name = 'Data Hattı' AND ${ASSET_PHONE_EXPR} = ? LIMIT 1
    `).get(cleanPhone);
    if (res) return {
        personnel_id: null,
        company_id: res.company_id,
        cost_center_id: null,
        name: res.name || '',
        costCenter: '',
        company: res.company_name || '',
        tariff: res.package_name || '',
        isMatched: true
    };

    // 4. Personeller tablosunda direkt telefon numarasıyla ara
    res = db.prepare(`
      SELECT
        p.id as personnel_id,
        p.first_name || ' ' || p.last_name as name,
        cc.id as cost_center_id,
        cc.name as cost_center_name,
        comp.id as company_id,
        comp.name as company_name
      FROM personnel p
      LEFT JOIN cost_centers cc ON p.cost_center_id = cc.id
      LEFT JOIN companies comp ON p.company_id = comp.id
      WHERE ${PERSONNEL_PHONE_EXPR} = ? LIMIT 1
    `).get(cleanPhone);
    if (res) return {
        personnel_id: res.personnel_id,
        company_id: res.company_id,
        cost_center_id: res.cost_center_id,
        name: res.name,
        costCenter: res.cost_center_name || '',
        company: res.company_name || '',
        tariff: '',
        isMatched: true
    };

    return {
        personnel_id: null,
        company_id: null,
        cost_center_id: null,
        name: '',
        costCenter: '',
        company: '',
        tariff: '',
        isMatched: false
    };
  } catch (e) {
    console.error('Invoice Matcher - Lookup Error:', e);
    return { name: '', costCenter: '', company: '', tariff: '', isMatched: false };
  }
}

module.exports = {
  findPersonnelByPhone,
  normalizePhone
};
