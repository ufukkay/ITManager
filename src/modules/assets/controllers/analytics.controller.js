const { db } = require('../../../database/db');

// Financial Summary
exports.getFinancialSummary = (req, res) => {
    try {
        const assets = db.prepare('SELECT purchase_price, lifetime_months FROM assets').all();
        let totalValuation = 0;
        let totalMonthlyCost = 0;

        assets.forEach(a => {
            const price = parseFloat(a.purchase_price) || 0;
            totalValuation += price;
            if (a.lifetime_months && a.lifetime_months > 0) {
                totalMonthlyCost += price / a.lifetime_months;
            }
        });

        res.json({
            totalValuation: Math.round(totalValuation * 100) / 100,
            monthlyAmortization: Math.round(totalMonthlyCost * 100) / 100
        });
    } catch (err) {
        console.error('getFinancialSummary error:', err);
        res.status(500).json({ error: 'Finansal özet alınamadı.' });
    }
};

// Matrix Analytics & Structural Envanter Haritası
exports.getMatrixAnalytics = (req, res) => {
    try {
        // 1. General Status Breakdown & Financials
        const totalAssets = db.prepare(`SELECT COUNT(*) as count, SUM(purchase_price) as totalValuation FROM assets`).get();

        const inUseAssets = db.prepare(`
            SELECT COUNT(*) as count, SUM(purchase_price) as totalValuation
            FROM assets a
            JOIN asset_statuses ast ON a.status_id = ast.id
            WHERE (a.personnel_id IS NOT NULL OR a.location_id IS NOT NULL)
               OR ast.name LIKE '%Zimmet%' OR ast.name LIKE '%Kullanım%'
        `).get();

        const inRepairAssets = db.prepare(`
            SELECT COUNT(*) as count, SUM(purchase_price) as totalValuation
            FROM assets a
            JOIN asset_statuses ast ON a.status_id = ast.id
            WHERE ast.name LIKE '%Arıza%' OR ast.name LIKE '%Servis%' OR ast.name LIKE '%Tamir%'
        `).get();

        const scrappedAssets = db.prepare(`
            SELECT COUNT(*) as count, SUM(purchase_price) as totalValuation
            FROM assets a
            JOIN asset_statuses ast ON a.status_id = ast.id
            WHERE ast.name LIKE '%Hurda%' OR ast.name LIKE '%Arşiv%'
        `).get();

        const warehouseCount = (totalAssets.count || 0) - (inUseAssets.count || 0) - (inRepairAssets.count || 0) - (scrappedAssets.count || 0);

        // 2. Category Breakdown
        const categoryBreakdown = db.prepare(`
            SELECT ac.id, ac.name, COUNT(a.id) as count, SUM(a.purchase_price) as total_value
            FROM asset_categories ac
            LEFT JOIN asset_models am ON am.category_id = ac.id
            LEFT JOIN assets a ON a.model_id = am.id
            GROUP BY ac.id, ac.name
            ORDER BY count DESC
        `).all();

        // 3. Location Breakdown Matrix
        const locationBreakdown = db.prepare(`
            SELECT
                l.id, l.name, l.address,
                COUNT(a.id) as total_assets,
                SUM(CASE WHEN a.personnel_id IS NOT NULL OR a.location_id IS NOT NULL THEN 1 ELSE 0 END) as in_use_count,
                SUM(CASE WHEN ast.name LIKE '%Arıza%' OR ast.name LIKE '%Servis%' THEN 1 ELSE 0 END) as repair_count,
                SUM(a.purchase_price) as total_value
            FROM locations l
            LEFT JOIN assets a ON a.location_id = l.id
            LEFT JOIN asset_statuses ast ON a.status_id = ast.id
            GROUP BY l.id, l.name
            ORDER BY total_assets DESC
        `).all();

        // 4. Company & Department Assignment Matrix
        const companyBreakdown = db.prepare(`
            SELECT
                c.id, c.name,
                COUNT(a.id) as total_assets,
                SUM(CASE WHEN a.personnel_id IS NOT NULL THEN 1 ELSE 0 END) as personnel_assigned_count,
                SUM(a.purchase_price) as total_value
            FROM companies c
            LEFT JOIN assets a ON a.company_id = c.id
            GROUP BY c.id, c.name
            ORDER BY total_assets DESC
        `).all();

        res.json({
            summary: {
                totalCount: totalAssets.count || 0,
                totalValuation: totalAssets.totalValuation || 0,
                inUseCount: inUseAssets.count || 0,
                inUseValuation: inUseAssets.totalValuation || 0,
                warehouseCount: warehouseCount < 0 ? 0 : warehouseCount,
                inRepairCount: inRepairAssets.count || 0,
                scrappedCount: scrappedAssets.count || 0
            },
            categories: categoryBreakdown,
            locations: locationBreakdown,
            companies: companyBreakdown
        });
    } catch (err) {
        console.error('getMatrixAnalytics error:', err);
        res.status(500).json({ error: 'Matris verileri alınamadı.' });
    }
};
