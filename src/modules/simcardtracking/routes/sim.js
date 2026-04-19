const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { hasPermission } = require('../../../middleware/auth');
const { logActivity } = require('../middleware/logger');

// GET /api/sim/search?q=...
router.get('/search', hasPermission('sim:view'), (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: 'Arama terimi gerekli.' });

  const queryTerm = `%${q}%`;
  
  try {
    const results = [];

    // Search M2M
    const m2m = db.prepare(`
      SELECT 'm2m' as type, sim_m2m.*, v.plate_no 
      FROM sim_m2m 
      LEFT JOIN vehicles v ON sim_m2m.vehicle_id = v.id
      WHERE phone_no LIKE ? OR iccid LIKE ? OR v.plate_no LIKE ?
    `).all(queryTerm, queryTerm, queryTerm);
    results.push(...m2m);

    // Search Data
    const data = db.prepare(`
      SELECT 'data' as type, sim_data.*, l.name as location_name 
      FROM sim_data 
      LEFT JOIN locations l ON sim_data.location_id = l.id
      WHERE phone_no LIKE ? OR iccid LIKE ? OR l.name LIKE ?
    `).all(queryTerm, queryTerm, queryTerm);
    results.push(...data);

    // Search Voice
    const voice = db.prepare(`
      SELECT 'voice' as type, sim_voice.*, (p.first_name || ' ' || p.last_name) as personnel_name 
      FROM sim_voice 
      LEFT JOIN personnel p ON sim_voice.personnel_id = p.id
      WHERE phone_no LIKE ? OR iccid LIKE ? OR personnel_name LIKE ?
    `).all(queryTerm, queryTerm, queryTerm);
    results.push(...voice);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/sim/transfer
router.post('/transfer', hasPermission('sim:edit'), (req, res) => {
  const { id, currentType, targetType, targetData } = req.body;

  if (!id || !currentType || !targetType) {
    return res.status(400).json({ message: 'Eksik parametre: id, currentType ve targetType zorunludur.' });
  }

  if (currentType === targetType && !targetData) {
    return res.status(400).json({ message: 'Kaynak ve hedef tip aynı olamaz (Veri güncellemesi yoksa).' });
  }

  const validTypes = ['m2m', 'data', 'voice'];
  if (!validTypes.includes(currentType) || !validTypes.includes(targetType)) {
    return res.status(400).json({ message: 'Geçersiz hat tipi.' });
  }

  const sourceTable = `sim_${currentType}`;
  const targetTable = `sim_${targetType}`;

  try {
    const transaction = db.transaction(() => {
      // 1. Kaynak veriyi bul
      const row = db.prepare(`SELECT * FROM ${sourceTable} WHERE id = ?`).get(id);
      if (!row) throw new Error('Kaynak kayıt bulunamadı.');

      let finalId = id;

      if (currentType !== targetType) {
        // 2. Hedef tablonun kolonlarını al
        const targetColumns = db.prepare(`PRAGMA table_info(${targetTable})`).all().map(c => c.name);

        // 3. Ortak verileri hazırla
        const transferData = {};
        targetColumns.forEach(col => {
          if (col === 'id' || col === 'created_at' || col === 'updated_at') return;
          
          if (row.hasOwnProperty(col)) {
            transferData[col] = row[col];
          } else {
            transferData[col] = null;
          }
        });

        // Overlay targetData if provided (e.g. new vehicle_id)
        if (targetData) {
          Object.keys(targetData).forEach(key => {
            if (targetColumns.includes(key)) {
              transferData[key] = targetData[key];
            }
          });
        }

        // 4. Hedef tabloya ekle
        const cols = Object.keys(transferData);
        const placeholders = cols.map(() => '?').join(', ');
        const insertQuery = `INSERT INTO ${targetTable} (${cols.join(', ')}) VALUES (${placeholders})`;
        const insertResult = db.prepare(insertQuery).run(...Object.values(transferData));
        finalId = insertResult.lastInsertRowid;

        // 5. Kaynak tablodan sil
        db.prepare(`DELETE FROM ${sourceTable} WHERE id = ?`).run(id);
      } else if (targetData) {
        // Same table, just update columns (Owner shift)
        const fields = [];
        const params = [];
        Object.keys(targetData).forEach(key => {
            fields.push(`${key} = ?`);
            params.push(targetData[key]);
        });
        fields.push('updated_at = CURRENT_TIMESTAMP');
        db.prepare(`UPDATE ${targetTable} SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
      }

      return { newId: finalId, phone_no: row.phone_no };
    });

    const result = transaction();

    // 6. Log kaydı
    logActivity(req, 'TRANSFER', targetType.toUpperCase(), result.newId, { 
      fromType: currentType, 
      toType: targetType, 
      phone_no: result.phone_no,
      originalId: id,
      targetData
    });

    res.json({ 
      success: true, 
      message: `SIM kart başarıyla ${currentType !== targetType ? targetType.toUpperCase() + ' hattına dönüştürüldü ve ' : ''}aktarıldı.`,
      newId: result.newId
    });

  } catch (err) {
    console.error('Transfer Error:', err);
    res.status(500).json({ message: `Aktarım işlemi başarısız: ${err.message}` });
  }
});


module.exports = router;

