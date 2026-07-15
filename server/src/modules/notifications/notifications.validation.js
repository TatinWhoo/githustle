// src/modules/notifications/notifications.validation.js
const { z } = require('zod');

// Purpose: Validate the notifcation ID param for mark-as-read calls.
const notificationIdParamSchema = z.object({
    notificationId: z.string().uuid('Invalid Notification ID'),
});

// Purpose: Cursoe-paginated list of notifications for the curent usuer.
// isRead filter: 'true' / 'false' string from query => boolean via transform.
const listNotificationsQuerySchema = z.object({
    isRead: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
    notificationIdParamSchema,
    listNotificationsQuerySchema,
};