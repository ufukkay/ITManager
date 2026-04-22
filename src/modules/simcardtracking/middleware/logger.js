const AuditService = require('../../../services/auditService');

/**
 * Logs a user activity to the database using the unified AuditService.
 * @param {Object} req - Express request object
 * @param {string} action - The action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} module - The module affected (e.g., 'M2M', 'DATA', 'VOICE')
 * @param {string|number} targetId - ID of the affected record
 * @param {object} details - Additional information
 */
function logActivity(req, action, module, targetId = null, details = null) {
    const userId = req.session && req.session.user ? req.session.user.id : (req.user ? req.user.id : null);
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    AuditService.logActivity({
        userId,
        module: `SIM_${module}`,
        action,
        resourceId: targetId,
        details,
        ipAddress
    });
}

module.exports = { logActivity };
