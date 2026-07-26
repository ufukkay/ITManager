const { db } = require('../../../database/db');

// Logs history for single asset
exports.getAssetLogs = (req, res) => {
    try {
        const { id } = req.params;
        const logs = db.prepare(`
            SELECT
                al.*,
                u.full_name as user_name,
                p.first_name || ' ' || p.last_name as personnel_target_name,
                l.name as location_target_name
            FROM asset_logs al
            LEFT JOIN users u ON al.created_by = u.id
            LEFT JOIN personnel p ON al.target_type = 'PERSONNEL' AND al.target_id = p.id
            LEFT JOIN locations l ON al.target_type = 'LOCATION' AND al.target_id = l.id
            WHERE al.asset_id = ?
            ORDER BY al.created_at DESC
        `).all(id);
        res.json(logs);
    } catch (err) {
        console.error('getAssetLogs error:', err);
        res.status(500).json({ error: 'İşlem logları yüklenemedi.' });
    }
};

// --- ASSET NOTES ARCHIVE ENDPOINTS ---
exports.getAssetNotes = (req, res) => {
    try {
        const { id } = req.params;
        const notes = db.prepare('SELECT * FROM asset_notes WHERE asset_id = ? ORDER BY created_at DESC').all(id);
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: 'Notlar alınamadı.' });
    }
};

exports.addAssetNote = (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        if (!note || !note.trim()) {
            return res.status(400).json({ error: 'Not içeriği boş olamaz.' });
        }
        const userName = req.session?.user?.full_name || req.session?.user?.username || 'Kullanıcı';
        const info = db.prepare('INSERT INTO asset_notes (asset_id, user_name, note) VALUES (?, ?, ?)').run(id, userName, note.trim());
        res.json({ id: info.lastInsertRowid, user_name: userName, note: note.trim(), created_at: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: 'Not eklenemedi.' });
    }
};
