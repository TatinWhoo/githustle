// src/modules/notifications/notifications.service.js
const AppError = require('../../utils/AppError');
const repo = require('./notifications.repository');

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────

function toNotificationDTO(n) {
    return {
        id: n.id,
        recipientId: n.user_id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.action_url,
        isRead: n.is_read,
        readAt: n.read_at,
        createdAt: n.created_at,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURSOR PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

function buildCursorResponse(rows, limit, keyField = 'createdAt') {
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1][keyField] : null;
    return { data, hasMore, nextCursor };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC FACTORY — called by other services (invoices, projects, jobs)
// Purpose: Creates a DB notification AND pushes it over Socket.io in real-time.
// Gracefully skips the socket push if the socket server isn't initialized
// (e.g., unit tests or CLI scripts).
// ─────────────────────────────────────────────────────────────────────────────

async function notify(recipientId, type, title, body, link) {
    const notif = await repo.createNotification({ recipientId, type, title, body, link });

    // Real-time push to the user's personal socket room.
    // getIo() is added to socket/index.js in the integration step below.
    try {
        const { getIo } = require('../../socket');
        const io = getIo();
        if (io) {
            io.to(`user:${recipientId}`).emit('new_notification', toNotificationDTO(notif));
        }
    } catch (_) {
        // Socket not initialized in non-server contexts — silently skip
    }

    return notif;
}

// ─────────────────────────────────────────────────────────────────────────────
// REST-FACING SERVICES
// ─────────────────────────────────────────────────────────────────────────────

async function listNotifications(userId, filters) {
    const rows = await repo.listNotifications(userId, filters);
    return buildCursorResponse(rows.map(toNotificationDTO), filters.limit);
}

async function getUnreadCount(userId) {
    return repo.countUnread(userId);
}

// Purpose: Mark one notification as read. Ownership check prevents users
// from marking other users' notifications.
async function markRead(userId, notificationId) {
    const notif = await repo.findNotificationById(notificationId);
    if (!notif) throw new AppError('Notification not found.', 404);
    if (notif.user_id !== userId) throw new AppError('Forbidden.', 403);

    const updated = await repo.markNotificationRead(notificationId);
    // If already read, updated is null — return the existing record
    return toNotificationDTO(updated ?? notif);
}

async function markAllRead(userId) {
    const count = await repo.markAllNotificationsRead(userId);
    return { markedCount: count };
}

module.exports = {
    notify,
    listNotifications, getUnreadCount, markRead, markAllRead,
};
