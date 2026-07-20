// src/middleware/auditLog.js
// Purpose: Express middleware that records admin actions to the audit_logs table.
//
// Usage (in routes):
//   router.patch('/:userId/ban', authenticate, requireRole('admin'),
//       auditLog('user.ban', 'user', (req) => req.params.userId),
//       controller.banUser);
//
// The middleware runs AFTER the controller (via res.on('finish'))
// so it only logs successful actions (status < 400).
const { query } = require('../config/database');
const logger = require('../config/logger');

function auditLog(action, entityType, getEntityId) {
    return (req, res, next) => {
        // Capture the original JSON method to snapshot the response body
        const originalJson = res.json.bind(res);
        let responseBody = null;

        res.json = (body) => {
            responseBody = body;
            return originalJson(body);
        };

        res.on('finish', async () => {
            // Only log successful admin actions
            if (res.statusCode >= 400) return;

            try {
                const entityId = typeof getEntityId === 'function'
                    ? getEntityId(req)
                    : null;

                await query(
                    `INSERT INTO audit_logs
                       (user_id, action, entity_type, entity_id, new_value, ip_address, user_agent)
                     VALUES ($1, $2, $3, $4, $5, $6::INET, $7)`,
                    [
                        req.user?.id ?? null,
                        action,
                        entityType,
                        entityId,
                        responseBody ? JSON.stringify(responseBody) : null,
                        req.ip,
                        req.get('User-Agent') ?? null,
                    ]
                );
            } catch (err) {
                // Never crash the request because of audit logging
                logger.error({ err, action, entityType }, 'Audit log insert failed');
            }
        });

        next();
    };
}

module.exports = auditLog;
