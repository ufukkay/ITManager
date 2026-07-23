const { db } = require('../database/db');

/**
 * Log an activity to the audit_logs table
 * @param {Object} params
 * @param {number} params.userId - User who performed the action
 * @param {string} params.module - Module name (e.g., 'SIM_VOICE', 'PERSONNEL')
 * @param {string} params.action - Action type ('CREATE', 'UPDATE', 'DELETE')
 * @param {string|number} params.resourceId - ID of the resource being modified
 * @param {Object} params.details - JSON object containing details (e.g., old vs new values)
 * @param {string} params.ipAddress - IP address of the user
 */
const logActivity = ({ userId, module, action, resourceId, details, ipAddress }) => {
    try {
        const stmt = db.prepare(`
            INSERT INTO audit_logs (user_id, module, action, resource_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            userId || null,
            module,
            action,
            resourceId ? String(resourceId) : null,
            details ? JSON.stringify(details) : null,
            ipAddress || null
        );
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

/**
 * Get recent activities for the dashboard
 * @param {number} limit - Number of logs to fetch
 */
const getRecentActivities = (limit = 10) => {
    return db.prepare(`
        SELECT 
            al.*, 
            u.full_name as user_name,
            u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT ?
    `).all(limit);
};

/**
 * Get history for a specific resource
 * @param {string} module - Module name
 * @param {string|number} resourceId - Resource ID
 */
const getResourceHistory = (module, resourceId) => {
    return db.prepare(`
        SELECT 
            al.*, 
            u.full_name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.module = ? AND al.resource_id = ?
        ORDER BY al.created_at DESC
    `).all(module, String(resourceId));
};

const getFilteredAuditLogs = (filters = {}) => {
    let sql = `
        SELECT 
            al.*, 
            u.full_name as user_name,
            u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.module) {
        sql += " AND al.module = ?";
        params.push(filters.module);
    }
    if (filters.action) {
        sql += " AND al.action = ?";
        params.push(filters.action);
    }
    if (filters.search) {
        sql += " AND (al.details LIKE ? OR al.resource_id LIKE ? OR u.full_name LIKE ?)";
        const s = `%${filters.search}%`;
        params.push(s, s, s);
    }

    sql += " ORDER BY al.created_at DESC";

    if (filters.limit) {
        sql += " LIMIT ?";
        params.push(parseInt(filters.limit));
        if (filters.offset) {
            sql += " OFFSET ?";
            params.push(parseInt(filters.offset));
        }
    }

    const rows = db.prepare(sql).all(...params);
    
    // Count total for pagination
    let countSql = `
        SELECT COUNT(*) as total
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    `;
    const countParams = [];
    if (filters.module) {
        countSql += " AND al.module = ?";
        countParams.push(filters.module);
    }
    if (filters.action) {
        countSql += " AND al.action = ?";
        countParams.push(filters.action);
    }
    if (filters.search) {
        countSql += " AND (al.details LIKE ? OR al.resource_id LIKE ? OR u.full_name LIKE ?)";
        const s = `%${filters.search}%`;
        countParams.push(s, s, s);
    }
    const total = db.prepare(countSql).get(...countParams).total;

    return { rows, total };
};

module.exports = {
    logActivity,
    getRecentActivities,
    getResourceHistory,
    getFilteredAuditLogs
};
