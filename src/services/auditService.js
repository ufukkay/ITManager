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

module.exports = {
    logActivity,
    getRecentActivities,
    getResourceHistory
};
