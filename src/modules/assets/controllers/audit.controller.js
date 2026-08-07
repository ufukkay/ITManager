const { db } = require('../../../database/db');

// Get Single Asset Info for Mobile Scan (Public/Authenticated)
exports.getAssetScanDetail = (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT
                a.*,
                am.name as model_name,
                ac.name as category_name,
                ab.name as brand_name,
                as_t.name as status_name,
                c.name as company_name,
                p.first_name || ' ' || p.last_name as personnel_name,
                p.email as personnel_email,
                l.name as location_name
            FROM assets a
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_categories ac ON am.category_id = ac.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            JOIN asset_statuses as_t ON a.status_id = as_t.id
            JOIN companies c ON a.company_id = c.id
            LEFT JOIN personnel p ON a.personnel_id = p.id
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE a.id = ? OR a.barcode = ? OR a.serial_no = ?
        `;
        const asset = db.prepare(query).get(id, id, id);
        if (!asset) {
            return res.status(404).json({ error: 'Envanter bulunamadı.' });
        }

        const audits = db.prepare('SELECT * FROM asset_audits WHERE asset_id = ? ORDER BY created_at DESC LIMIT 5').all(asset.id);
        res.json({ asset, audits });
    } catch (err) {
        console.error('getAssetScanDetail error:', err);
        res.status(500).json({ error: 'Mobil tarama detayı alınamadı.' });
    }
};

// Submit Mobile Asset Audit (Saha Sayımı Onayı)
exports.submitAssetAudit = (req, res) => {
    try {
        const { id } = req.params;
        const { notes, audited_by_name } = req.body;

        const asset = db.prepare('SELECT id, serial_no FROM assets WHERE id = ?').get(id);
        if (!asset) return res.status(404).json({ error: 'Varlık bulunamadı.' });

        const auditorName = audited_by_name || (req.session?.user?.full_name) || 'Mobil Saha Personeli';
        const auditorId = req.session?.user?.id || null;

        db.prepare('UPDATE assets SET last_audit_date = CURRENT_TIMESTAMP WHERE id = ?').run(id);

        db.prepare('INSERT INTO asset_audits (asset_id, audited_by, audited_by_name, notes) VALUES (?, ?, ?, ?)')
          .run(id, auditorId, auditorName, notes || 'Mobil QR Saha Sayımı Yapıldı - Zimmet Yerinde OK');

        db.prepare("INSERT INTO asset_logs (asset_id, action, target_type, notes) VALUES (?, 'AUDIT', 'NONE', ?)")
          .run(id, `Saha Sayımı Doğrulandı: ${auditorName}`);

        res.json({ success: true, message: 'Mobil QR Saha Sayımı başarıyla doğrulandı.' });
    } catch (err) {
        console.error('submitAssetAudit error:', err);
        res.status(500).json({ error: 'Saha sayımı işlenemedi.' });
    }
};

// Get Audit Summary & Periodicity Compliance Metrics
exports.getAuditSummary = (req, res) => {
    try {
        const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'audit_period_days'").get();
        const periodDays = setting ? Number(setting.value) : 90;

        const totalAssigned = db.prepare("SELECT COUNT(*) as c FROM assets WHERE personnel_id IS NOT NULL OR location_id IS NOT NULL").get().c;

        const auditedCount = db.prepare(`
            SELECT COUNT(*) as c
            FROM assets
            WHERE (personnel_id IS NOT NULL OR location_id IS NOT NULL)
              AND last_audit_date IS NOT NULL
              AND last_audit_date >= datetime('now', '-' || ? || ' days')
        `).get(periodDays).c;

        const overdueCount = totalAssigned - auditedCount;

        // Personnel with overdue audits
        const overduePersonnelList = db.prepare(`
            SELECT DISTINCT p.id, p.first_name, p.last_name, p.title, c.name as company_name, d.name as department_name,
                   MAX(a.last_audit_date) as max_last_audit_date,
                   COUNT(a.id) as assigned_asset_count
            FROM personnel p
            JOIN assets a ON a.personnel_id = p.id
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN departments d ON p.department_id = d.id
            GROUP BY p.id
            HAVING max_last_audit_date IS NULL OR max_last_audit_date < datetime('now', '-' || ? || ' days')
        `).all(periodDays);

        res.json({
            periodDays,
            totalAssigned,
            auditedCount,
            overdueCount,
            overduePersonnelCount: overduePersonnelList.length,
            overduePersonnelList
        });
    } catch (err) {
        console.error('getAuditSummary error:', err);
        res.status(500).json({ error: 'Denetim özeti alınamadı.' });
    }
};

// Get Personnel Assets Audit Session
exports.getPersonnelAuditSession = (req, res) => {
    try {
        const { personnelId } = req.params;
        const person = db.prepare("SELECT p.*, c.name as company_name, d.name as department_name FROM personnel p LEFT JOIN companies c ON p.company_id = c.id LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?").get(personnelId);
        if (!person) return res.status(404).json({ error: 'Personel bulunamadı.' });

        const assets = db.prepare(`
            SELECT a.*, am.name as model_name, ab.name as brand_name, ac.name as category_name
            FROM assets a
            JOIN asset_models am ON a.model_id = am.id
            JOIN asset_brands ab ON am.brand_id = ab.id
            JOIN asset_categories ac ON am.category_id = ac.id
            WHERE a.personnel_id = ?
        `).all(personnelId);

        res.json({ person, assets });
    } catch (err) {
        console.error('getPersonnelAuditSession error:', err);
        res.status(500).json({ error: 'Personel sayım verileri alınamadı.' });
    }
};

// Submit Personnel Batch Audit Session
exports.submitPersonnelAuditSession = (req, res) => {
    try {
        const { personnel_id, audited_asset_ids, notes } = req.body;
        if (!personnel_id || !Array.isArray(audited_asset_ids)) {
            return res.status(400).json({ error: 'Geçersiz sayım verisi.' });
        }

        const auditorName = (req.session?.user?.full_name) || 'Mobil Saha Teknisyeni';
        const auditorId = req.session?.user?.id || null;

        // Gönderilen id'lerin gerçekten bu personele zimmetli olduğunu doğrula —
        // aksi halde herhangi bir kullanıcı rastgele asset id'lerin sayım tarihini güncelleyebilir.
        const placeholders = audited_asset_ids.map(() => '?').join(',');
        const ownedAssets = audited_asset_ids.length
            ? db.prepare(`SELECT id FROM assets WHERE personnel_id = ? AND id IN (${placeholders})`).all(personnel_id, ...audited_asset_ids)
            : [];
        const ownedIds = new Set(ownedAssets.map(a => a.id));
        const skippedCount = audited_asset_ids.length - ownedIds.size;

        const updateAssetStmt = db.prepare("UPDATE assets SET last_audit_date = CURRENT_TIMESTAMP WHERE id = ?");
        const auditLogStmt = db.prepare("INSERT INTO asset_audits (asset_id, audited_by, audited_by_name, notes) VALUES (?, ?, ?, ?)");
        const actionLogStmt = db.prepare("INSERT INTO asset_logs (asset_id, action, target_type, notes) VALUES (?, 'AUDIT', 'NONE', ?)");

        audited_asset_ids.forEach(assetId => {
            if (!ownedIds.has(assetId)) return;
            updateAssetStmt.run(assetId);
            auditLogStmt.run(assetId, auditorId, auditorName, notes || 'Saha Personel Zimmet Sayımı Tamamlandı - Onaylandı');
            actionLogStmt.run(assetId, `Saha Zimmet Kontrolü Onaylandı: ${auditorName}`);
        });

        const message = skippedCount > 0
            ? `${ownedIds.size} cihaz için zimmet sayımı tescillendi. ${skippedCount} cihaz bu personele ait olmadığı için atlandı.`
            : `${ownedIds.size} cihaz için zimmet sayımı tescillendi.`;
        res.json({ success: true, message });
    } catch (err) {
        console.error('submitPersonnelAuditSession error:', err);
        res.status(500).json({ error: 'Saha zimmet sayımı kaydedilemedi.' });
    }
};

// Get & Update Audit Period Settings
exports.getAuditPeriodSettings = (req, res) => {
    try {
        const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'audit_period_days'").get();
        res.json({ audit_period_days: setting ? Number(setting.value) : 90 });
    } catch (err) {
        res.status(500).json({ error: 'Ayar yüklenemedi.' });
    }
};

exports.updateAuditPeriodSettings = (req, res) => {
    try {
        const { audit_period_days } = req.body;
        if (!audit_period_days || isNaN(audit_period_days)) {
            return res.status(400).json({ error: 'Geçerli bir gün sayısı yazınız.' });
        }
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('audit_period_days', ?)").run(String(audit_period_days));
        res.json({ success: true, audit_period_days: Number(audit_period_days) });
    } catch (err) {
        res.status(500).json({ error: 'Ayar güncellenemedi.' });
    }
};

// ── ENVANTER & ZİMMET STOK SAYIM MODÜLÜ (AUDIT WORKFLOW) ─────────────────────

// 1. QR / Barkod ile Cihaz Bilgisi Arama (Kontrol Et Aşaması)
exports.lookupAssetForAudit = (req, res) => {
    try {
        const { code } = req.body;
        if (!code || !String(code).trim()) {
            return res.status(400).json({ error: 'Lütfen taranan QR veya barkod kodunu giriniz.' });
        }

        let queryCode = String(code).trim();
        // Smart URL & QR code parser
        if (queryCode.includes('/scan/asset/')) {
            const match = queryCode.match(/\/scan\/asset\/(\d+)/i);
            if (match) queryCode = match[1];
        } else if (queryCode.includes('/assets/')) {
            const match = queryCode.match(/\/assets\/(\d+)/i);
            if (match) queryCode = match[1];
        } else if (queryCode.startsWith('http://') || queryCode.startsWith('https://')) {
            try {
                const u = new URL(queryCode);
                const idParam = u.searchParams.get('id') || u.searchParams.get('asset_id') || u.searchParams.get('code');
                if (idParam) queryCode = idParam;
            } catch (e) {}
        }

        const asset = db.prepare(`
            SELECT
                a.*,
                am.name as model_name,
                ab.name as brand_name,
                ac.name as category_name,
                ac.custom_fields_json,
                ast.name as status_name,
                c.name as company_name,
                p.first_name || ' ' || p.last_name as personnel_name,
                dept.name as personnel_department,
                l.name as location_name
            FROM assets a
            LEFT JOIN asset_models am ON a.model_id = am.id
            LEFT JOIN asset_brands ab ON am.brand_id = ab.id
            LEFT JOIN asset_categories ac ON am.category_id = ac.id
            LEFT JOIN asset_statuses ast ON a.status_id = ast.id
            LEFT JOIN companies c ON a.company_id = c.id
            LEFT JOIN personnel p ON a.personnel_id = p.id
            LEFT JOIN departments dept ON p.department_id = dept.id
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE LOWER(a.serial_no) = LOWER(?) OR LOWER(a.barcode) = LOWER(?) OR a.id = ?
        `).get(queryCode, queryCode, isNaN(queryCode) ? -1 : Number(queryCode));

        if (!asset) {
            return res.status(404).json({ error: `"${queryCode}" koduna ait envanter kaydı bulunamadı.` });
        }

        // Parse custom_fields & specs_json
        let customFields = [];
        if (asset.custom_fields_json) {
            try { customFields = JSON.parse(asset.custom_fields_json); } catch (e) {}
        }
        let specs = {};
        if (asset.specs_json) {
            try { specs = typeof asset.specs_json === 'string' ? JSON.parse(asset.specs_json) : asset.specs_json; } catch (e) {}
        }

        // Check if there is a recent audit item record for this asset
        const lastAuditItem = db.prepare(`
            SELECT * FROM audit_session_items WHERE asset_id = ? ORDER BY scanned_at DESC LIMIT 1
        `).get(asset.id);

        res.json({
            asset: {
                ...asset,
                custom_fields: customFields,
                specs: specs,
                last_audit_status: lastAuditItem ? lastAuditItem.status : null,
                last_audit_note: lastAuditItem ? lastAuditItem.discrepancy_note : null,
                last_audit_at: lastAuditItem ? lastAuditItem.scanned_at : null
            }
        });
    } catch (err) {
        console.error('lookupAssetForAudit error:', err);
        res.status(500).json({ error: 'Cihaz bilgileri sorgulanırken hata oluştu.' });
    }
};

// 2. Sayım Sonucu İletme (Say veya Cihaz Bilgileri Hatalı + Zorunlu Not)
exports.submitAuditItemResult = (req, res) => {
    try {
        const { asset_id, campaign_id, status, discrepancy_note } = req.body;
        const userId = req.session?.user?.id || null;
        const userName = req.session?.user?.full_name || 'Saha Görevlisi';

        if (!asset_id || !status) {
            return res.status(400).json({ error: 'Varlık ID ve sayım durumu gereklidir.' });
        }

        // ZORUNLU NOT KONTROLÜ: Cihaz bilgileri hatalı seçildiyse not boş olamaz!
        if (status === 'DATA_ERROR' && (!discrepancy_note || !discrepancy_note.trim())) {
            return res.status(400).json({ error: 'Cihaz bilgileri hatalı seçildiğinde açıklama / not girilmesi zorunludur! Lütfen hatayı açıklayınız.' });
        }

        const noteText = (discrepancy_note || '').trim();

        // 1. audit_session_items kaydı ekle
        db.prepare(`
            INSERT INTO audit_session_items (campaign_id, asset_id, status, discrepancy_note, scanned_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(campaign_id || null, asset_id, status, noteText || null, userId);

        // 2. Varlığın last_audit_date ve updated_at tarihlerini güncelle
        db.prepare(`UPDATE assets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(asset_id);

        // 3. Log ve Not arşivine ekle
        const logAction = status === 'COUNTED' ? 'AUDIT_VERIFIED' : 'AUDIT_DISCREPANCY';
        const logNotes = status === 'COUNTED'
            ? 'Stok sayımında fiziksel olarak doğrulandı (Sayıldı).'
            : `Stok sayımında uyuşmazlık/hata bildirildi: ${noteText}`;

        db.prepare(`
            INSERT INTO asset_logs (asset_id, action, target_type, notes, created_by)
            VALUES (?, ?, 'NONE', ?, ?)
        `).run(asset_id, logAction, logNotes, userId);

        if (noteText) {
            db.prepare(`
                INSERT INTO asset_notes (asset_id, user_name, note)
                VALUES (?, ?, ?)
            `).run(asset_id, userName, `[STOK SAYIM BİLDİRİMİ - ${status === 'DATA_ERROR' ? 'HATALI BİLGİ' : 'NOT'}] ${noteText}`);
        }

        res.json({
            success: true,
            message: status === 'COUNTED'
                ? 'Cihaz başarıyla sayıldı ve tescillendi.'
                : 'Cihaz bilgileri uyuşmazlık notuyla birlikte sayıma kaydedildi.'
        });
    } catch (err) {
        console.error('submitAuditItemResult error:', err);
        res.status(500).json({ error: 'Sayım kaydı işlenirken veritabanı hatası oluştu.' });
    }
};

// 3. Sayım Kampanyası Oluşturma
exports.createAuditCampaign = (req, res) => {
    try {
        const { title, audit_type, target_id, notes } = req.body;
        const userId = req.session?.user?.id || null;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Lütfen sayım görevi / kampanyası başlığını yazınız.' });
        }

        const info = db.prepare(`
            INSERT INTO audit_campaigns (title, audit_type, target_id, notes, created_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(title.trim(), audit_type || 'GENERAL', target_id || null, notes || null, userId);

        res.json({ success: true, id: info.lastInsertRowid, title });
    } catch (err) {
        console.error('createAuditCampaign error:', err);
        res.status(500).json({ error: 'Sayım görevi oluşturulamadı.' });
    }
};

// 4. Sayım Kampanyaları Listesi ve İlerleme Raporu
exports.getAuditCampaigns = (req, res) => {
    try {
        const campaigns = db.prepare(`
            SELECT
                ac.*,
                u.full_name as creator_name,
                (SELECT COUNT(DISTINCT asset_id) FROM audit_session_items WHERE campaign_id = ac.id AND status = 'COUNTED') as counted_count,
                (SELECT COUNT(DISTINCT asset_id) FROM audit_session_items WHERE campaign_id = ac.id AND status = 'DATA_ERROR') as error_count,
                (SELECT COUNT(*) FROM assets WHERE status_id NOT IN (SELECT id FROM asset_statuses WHERE name LIKE '%Hurda%' OR name LIKE '%Kayıp%')) as total_assets
            FROM audit_campaigns ac
            LEFT JOIN users u ON ac.created_by = u.id
            ORDER BY ac.id DESC
        `).all();

        res.json(campaigns);
    } catch (err) {
        console.error('getAuditCampaigns error:', err);
        res.status(500).json({ error: 'Sayım görevleri listelenemedi.' });
    }
};

// 5. Aktif Sayım Durum Özeti & Şerh Listesi
exports.getAuditLiveStats = (req, res) => {
    try {
        const { campaign_id } = req.query;
        let whereClause = campaign_id ? "WHERE campaign_id = ?" : "";
        let params = campaign_id ? [campaign_id] : [];

        const countedItems = db.prepare(`
            SELECT COUNT(DISTINCT asset_id) as count FROM audit_session_items ${whereClause} ${campaign_id ? "AND" : "WHERE"} status = 'COUNTED'
        `).get(...params);

        const errorItems = db.prepare(`
            SELECT COUNT(DISTINCT asset_id) as count FROM audit_session_items ${whereClause} ${campaign_id ? "AND" : "WHERE"} status = 'DATA_ERROR'
        `).get(...params);

        const totalAssets = db.prepare(`
            SELECT COUNT(*) as count FROM assets
        `).get();

        const recentScans = db.prepare(`
            SELECT
                asi.*,
                a.serial_no,
                a.barcode,
                am.name as model_name,
                ab.name as brand_name,
                p.first_name || ' ' || p.last_name as personnel_name,
                u.full_name as scanned_by_name
            FROM audit_session_items asi
            JOIN assets a ON asi.asset_id = a.id
            LEFT JOIN asset_models am ON a.model_id = am.id
            LEFT JOIN asset_brands ab ON am.brand_id = ab.id
            LEFT JOIN personnel p ON a.personnel_id = p.id
            LEFT JOIN users u ON asi.scanned_by = u.id
            ${whereClause}
            ORDER BY asi.scanned_at DESC
            LIMIT 50
        `).all(...params);

        res.json({
            counted: countedItems?.count || 0,
            data_errors: errorItems?.count || 0,
            total_assets: totalAssets?.count || 0,
            recent_scans: recentScans
        });
    } catch (err) {
        console.error('getAuditLiveStats error:', err);
        res.status(500).json({ error: 'Sayım canlı istatistikleri alınamadı.' });
    }
};
