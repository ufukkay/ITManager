const { db } = require('../../../database/db');
const { formatPhone } = require('../../../utils/formatters');

// SIM hatları ayrı tablolarda değil, genel `assets` (Envanter) tablosunda birer satır.
// Tip ayrımı (M2M/Data/Ses) sabit "SIM Kart" kategorisi altındaki modeller üzerinden yapılır.
// Marka = operatör (Turkcell/Vodafone/Türk Telekom...): her operatör için kendi markası ve
// bu marka altında 3 hat tipi modeli olur (bkz. core/service.js syncOperatorBrandModels —
// yeni operatör eklenince otomatik oluşturulur). Yani aynı "Ses Hattı" ismiyle birden fazla
// model satırı olabilir (her biri farklı operatör markasına bağlı) — model_id her zaman
// belirli bir operatör + tipi ifade eder.
const SIM_CATEGORY_NAME = 'SIM Kart';

const TYPE_MODEL_NAME = {
  m2m: 'M2M Hattı',
  data: 'Data Hattı',
  voice: 'Ses Hattı',
};

const MODEL_NAME_TO_TYPE = Object.fromEntries(
  Object.entries(TYPE_MODEL_NAME).map(([type, modelName]) => [modelName, type])
);

const assertType = (type) => {
  if (!TYPE_MODEL_NAME[type]) throw new Error(`Bilinmeyen SIM tipi: ${type}`);
};

// Verilen tipe ait TÜM operatör markalarındaki model id'lerini döner (liste/silme gibi
// belirli bir markaya bağlı olmayan, sadece "bu tipte mi" diye filtreleyen işlemler için).
const resolveModelIdsByType = (type) => {
  assertType(type);
  return db.prepare(`
    SELECT am.id FROM asset_models am
    JOIN asset_categories ac ON am.category_id = ac.id
    WHERE ac.name = ? AND am.name = ?
  `).all(SIM_CATEGORY_NAME, TYPE_MODEL_NAME[type]).map(r => r.id);
};

// Belirli bir marka (operatör) + tip için model id'sini bulur (Aktarım Merkezi'nde tip
// değiştirirken aynı operatörün karşılık gelen modeline geçmek için kullanılır).
const resolveModelIdForBrandAndType = (brandId, type) => {
  assertType(type);
  const row = db.prepare(`
    SELECT am.id FROM asset_models am
    JOIN asset_categories ac ON am.category_id = ac.id
    WHERE ac.name = ? AND am.name = ? AND am.brand_id = ?
  `).get(SIM_CATEGORY_NAME, TYPE_MODEL_NAME[type], brandId);
  return row ? row.id : null;
};

// model_id'nin hangi SIM tipine ('m2m'/'data'/'voice') ait olduğunu döner;
// SIM Kart kategorisinde değilse null (Envanter formunun dispatch kararı için kullanılır).
const resolveTypeByModelId = (modelId) => {
  if (!modelId) return null;
  const row = db.prepare(`
    SELECT am.name FROM asset_models am
    JOIN asset_categories ac ON am.category_id = ac.id
    WHERE am.id = ? AND ac.name = ?
  `).get(modelId, SIM_CATEGORY_NAME);
  return row ? (MODEL_NAME_TO_TYPE[row.name] || null) : null;
};

// model_id'nin bağlı olduğu markayı (brand_id + ad) döner.
const resolveBrandByModelId = (modelId) => {
  return db.prepare(`
    SELECT ab.id, ab.name FROM asset_models am
    JOIN asset_brands ab ON am.brand_id = ab.id
    WHERE am.id = ?
  `).get(modelId);
};

// Marka adı = operatör adı varsayımıyla (syncOperatorBrandModels bunu garanti eder),
// model üzerinden operator_id çözer.
const resolveOperatorIdFromModel = (modelId) => {
  const brand = resolveBrandByModelId(modelId);
  if (!brand) return null;
  const op = db.prepare('SELECT id FROM operators WHERE name = ?').get(brand.name);
  return op ? op.id : null;
};

const defaultStatusId = () => {
  const row = db.prepare("SELECT id FROM asset_statuses WHERE name LIKE '%Depo%' OR name LIKE '%Boşta%' LIMIT 1").get();
  return row ? row.id : null;
};

const assignedStatusId = () => {
  const row = db.prepare("SELECT id FROM asset_statuses WHERE (name LIKE '%Zimmet%' OR name LIKE '%Kullanımda%') AND name NOT LIKE '%Kullanım Dışı%' AND name NOT LIKE '%Arşiv%' LIMIT 1").get();
  return row ? row.id : defaultStatusId();
};

// Checkout/checkin akışıyla tutarlı: bir sahiplik alanı (personel/lokasyon/araç/departman)
// atanmışsa "Zimmetlendi", hiçbiri yoksa "Depoda" durumuna geçilir.
const resolveStatusId = (owner) => {
  const hasOwner = owner.personnel_id || owner.location_id || owner.vehicle_id || owner.department_id;
  return hasOwner ? assignedStatusId() : defaultStatusId();
};

const generatePlaceholderSerial = (type) => `SIM-${type.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Tüm SIM tiplerinde tek telefon numarası benzersizliği
const checkDuplicatePhone = (phoneNo, excludeId) => {
  if (!phoneNo) return false;
  const row = excludeId
    ? db.prepare('SELECT 1 FROM assets WHERE phone_no = ? AND id != ?').get(phoneNo, excludeId)
    : db.prepare('SELECT 1 FROM assets WHERE phone_no = ?').get(phoneNo);
  return !!row;
};

// Her tip için liste görünümünün ihtiyaç duyduğu ek JOIN'ler farklı (m2m→araç, data→lokasyon, voice→personel)
const LIST_JOINS = {
  m2m: `
    LEFT JOIN vehicles v ON a.vehicle_id = v.id
    LEFT JOIN personnel pers ON a.personnel_id = pers.id
    LEFT JOIN departments d ON a.department_id = d.id
  `,
  data: `
    LEFT JOIN locations l ON a.location_id = l.id
    LEFT JOIN departments d ON a.department_id = d.id
  `,
  voice: `
    LEFT JOIN personnel pers ON a.personnel_id = pers.id
    LEFT JOIN departments d ON a.department_id = d.id
  `,
};

const LIST_COLUMNS = {
  m2m: `, v.plate_no, v.vehicle_type, pers.first_name || ' ' || pers.last_name as personnel_name, d.name as department_name`,
  data: `, l.name as location_name, d.name as department_name`,
  voice: `, pers.first_name || ' ' || pers.last_name as personnel_name, d.name as department_name`,
};

const baseSelect = (type) => `
  SELECT a.*,
         a.line_status as status,
         pkg.name as package_name, pkg.price as cost_try, pkg.data_limit as quota_gb,
         c.name as company_name,
         op.name as operator,
         ab.name as brand_name
         ${LIST_COLUMNS[type]}
  FROM assets a
  JOIN asset_models am ON a.model_id = am.id
  JOIN asset_brands ab ON am.brand_id = ab.id
  LEFT JOIN packages pkg ON a.package_id = pkg.id
  LEFT JOIN companies c ON a.company_id = c.id
  LEFT JOIN operators op ON a.operator_id = op.id
  ${LIST_JOINS[type]}
`;

const inClause = (ids) => ids.length > 0 ? ids.map(() => '?').join(',') : 'NULL';

const list = (type, filters = {}) => {
  assertType(type);
  const modelIds = resolveModelIdsByType(type);
  let query = baseSelect(type) + ` WHERE a.model_id IN (${inClause(modelIds)})`;
  const params = [...modelIds];

  if (filters.operator) { query += ' AND op.name = ?'; params.push(filters.operator); }
  if (filters.status) { query += ' AND a.line_status = ?'; params.push(filters.status); }
  if (filters.vehicle_type) { query += ' AND v.vehicle_type = ?'; params.push(filters.vehicle_type); }
  if (filters.location_id) { query += ' AND a.location_id = ?'; params.push(filters.location_id); }
  if (filters.search) {
    const s = `%${filters.search}%`;
    if (type === 'm2m') {
      query += ' AND (v.plate_no LIKE ? OR a.phone_no LIKE ? OR a.serial_no LIKE ? OR pers.first_name LIKE ? OR pers.last_name LIKE ? OR d.name LIKE ?)';
      params.push(s, s, s, s, s, s);
    } else if (type === 'data') {
      query += ' AND (a.phone_no LIKE ? OR a.serial_no LIKE ? OR l.name LIKE ? OR d.name LIKE ?)';
      params.push(s, s, s, s);
    } else {
      query += ' AND (a.phone_no LIKE ? OR a.serial_no LIKE ? OR pers.first_name LIKE ? OR pers.last_name LIKE ? OR d.name LIKE ?)';
      params.push(s, s, s, s, s);
    }
  }
  query += ' ORDER BY a.id DESC';
  return db.prepare(query).all(...params);
};

const getById = (type, id) => {
  assertType(type);
  const modelIds = resolveModelIdsByType(type);
  const query = baseSelect(type) + ` WHERE a.model_id IN (${inClause(modelIds)}) AND a.id = ?`;
  return db.prepare(query).get(...modelIds, id);
};

// Frontend payload'ındaki alan adlarını assets tablosu kolonlarına eşle.
const buildOwnerFields = (type, payload) => {
  const owner = { personnel_id: null, location_id: null, vehicle_id: null, department_id: null };
  if (type === 'm2m') {
    owner.vehicle_id = payload.vehicle_id || null;
    owner.personnel_id = payload.personnel_id || null;
    owner.department_id = payload.department_id || null;
  } else if (type === 'data') {
    owner.location_id = payload.location_id || null;
    owner.department_id = payload.department_id || null;
  } else if (type === 'voice') {
    owner.personnel_id = payload.personnel_id || null;
    owner.department_id = payload.department_id || null;
  }
  return owner;
};

// payload'da sahiplik alanlarından herhangi biri açıkça gönderilmiş mi? (Envanter'in genel
// formu artık sahiplik göndermiyor — zimmet ataması ayrı "Zimmetle" akışıyla yapılıyor —
// bu yüzden update sırasında sahiplik alanları payload'da yoksa MEVCUT değerler korunur.)
const OWNER_FIELD_NAMES = ['personnel_id', 'location_id', 'vehicle_id', 'department_id'];
const hasOwnerFields = (payload) => OWNER_FIELD_NAMES.some(k => payload[k] !== undefined);

// modelId artık çağıran taraftan (Envanter formunun Kategori→Marka→Model seçimi) doğrudan
// geliyor — tip ismine göre "tek" model arayıp belirsizliğe düşmüyoruz.
const create = (modelId, payload) => {
  const type = resolveTypeByModelId(modelId);
  if (!type) throw Object.assign(new Error('Geçersiz SIM modeli.'), { statusCode: 400 });

  const { iccid, notes, package_id, company_id, last_usage_date } = payload;
  const phoneNo = formatPhone(payload.phone_no);
  if (checkDuplicatePhone(phoneNo)) throw Object.assign(new Error('Bu telefon numarası zaten kayıtlı.'), { statusCode: 400 });

  const operatorId = resolveOperatorIdFromModel(modelId);
  const owner = hasOwnerFields(payload) ? buildOwnerFields(type, payload) : buildOwnerFields(type, {});
  const serialNo = (iccid && iccid.trim()) ? iccid.trim() : generatePlaceholderSerial(type);

  const result = db.prepare(`
    INSERT INTO assets (
      serial_no, model_id, status_id, company_id, line_status,
      phone_no, operator_id, package_id, last_usage_date, notes,
      personnel_id, location_id, vehicle_id, department_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    serialNo, modelId, resolveStatusId(owner), company_id || null, 'Aktif',
    phoneNo || null, operatorId, package_id || null, last_usage_date || null, notes || null,
    owner.personnel_id, owner.location_id, owner.vehicle_id, owner.department_id
  );
  return result.lastInsertRowid;
};

const update = (modelId, id, payload) => {
  const type = resolveTypeByModelId(modelId);
  if (!type) throw Object.assign(new Error('Geçersiz SIM modeli.'), { statusCode: 400 });

  const current = db.prepare('SELECT personnel_id, location_id, vehicle_id, department_id FROM assets WHERE id = ?').get(id);
  if (!current) return 0;

  const { iccid, notes, package_id, company_id, last_usage_date } = payload;
  const phoneNo = formatPhone(payload.phone_no);
  if (checkDuplicatePhone(phoneNo, id)) throw Object.assign(new Error('Bu telefon numarası zaten kayıtlı.'), { statusCode: 400 });

  const operatorId = resolveOperatorIdFromModel(modelId);
  // Sahiplik payload'da yoksa (Envanter'in genel düzenleme formu artık göndermiyor) mevcut
  // atamayı koru — aksi halde her düzenlemede zimmet sessizce sıfırlanırdı.
  const owner = hasOwnerFields(payload) ? buildOwnerFields(type, payload) : {
    personnel_id: current.personnel_id, location_id: current.location_id,
    vehicle_id: current.vehicle_id, department_id: current.department_id
  };

  const result = db.prepare(`
    UPDATE assets SET
      serial_no = COALESCE(NULLIF(?, ''), serial_no),
      model_id = ?, company_id = ?, phone_no = ?, operator_id = ?, package_id = ?,
      last_usage_date = ?, notes = ?, status_id = ?,
      personnel_id = ?, location_id = ?, vehicle_id = ?, department_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    iccid || '', modelId, company_id || null, phoneNo || null, operatorId, package_id || null,
    last_usage_date || null, notes || null, resolveStatusId(owner),
    owner.personnel_id, owner.location_id, owner.vehicle_id, owner.department_id,
    id
  );
  return result.changes;
};

const remove = (type, id) => {
  assertType(type);
  const modelIds = resolveModelIdsByType(type);
  return db.prepare(`DELETE FROM assets WHERE id = ? AND model_id IN (${inClause(modelIds)})`).run(id, ...modelIds).changes;
};

const bulkDelete = (type, ids) => {
  assertType(type);
  const modelIds = resolveModelIdsByType(type);
  return db.prepare(`DELETE FROM assets WHERE model_id IN (${inClause(modelIds)}) AND id IN (${inClause(ids)})`).run(...modelIds, ...ids).changes;
};

const BULK_UPDATE_ALLOWED = {
  m2m: ['status', 'notes', 'package_id'],
  data: ['status', 'notes', 'package_id'],
  voice: ['status', 'notes', 'package_id'],
};
const BULK_FIELD_COLUMN = { status: 'line_status', notes: 'notes', package_id: 'package_id' };

const bulkUpdate = (type, ids, data) => {
  assertType(type);
  const modelIds = resolveModelIdsByType(type);
  const allowed = BULK_UPDATE_ALLOWED[type];
  const fields = [];
  const params = [];
  Object.keys(data).forEach(key => {
    if (allowed.includes(key) && data[key] !== undefined) {
      fields.push(`${BULK_FIELD_COLUMN[key]} = ?`);
      params.push(data[key]);
    }
  });
  if (fields.length === 0) return 0;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  const query = `UPDATE assets SET ${fields.join(', ')} WHERE model_id IN (${inClause(modelIds)}) AND id IN (${inClause(ids)})`;
  return db.prepare(query).run(...params, ...modelIds, ...ids).changes;
};

module.exports = {
  resolveModelIdsByType,
  resolveModelIdForBrandAndType,
  resolveTypeByModelId,
  resolveBrandByModelId,
  resolveOperatorIdFromModel,
  checkDuplicatePhone,
  list,
  getById,
  create,
  update,
  remove,
  bulkDelete,
  bulkUpdate,
};
