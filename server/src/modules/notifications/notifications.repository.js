// src/modules/notifications/notifications.repository.js
const { query } = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Insert a notification for a single recipient.
// `link` is an optional deep-link path the front-end uses to navigate
// when the user clicks the notification bell item.
async function createNotification(data) {
    const { rows } = await query(
        `INSERT INTO notifications
           (user_id, type, title, body, action_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
            data.recipientId,
            data.type,
            data.title,
            data.body ?? null,
            data.link ?? null,
        ]
    );
    return rows[0];
}

// Purpose: Mark a single notification as read.
// AND is_read = FALSE prevents a spurious updated_at bump on already-read items.
async function markNotificationRead(notificationId) {
    const { rows } = await query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = NOW()
         WHERE id = $1 AND is_read = FALSE
         RETURNING *`,
        [notificationId]
    );
    return rows[0] || null;
}

// Purpose: Mark ALL unread notifications for a user as read in one shot.
// Returns the count of rows updated so the service can report it.
async function markAllNotificationsRead(recipientId) {
    const { rows } = await query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = NOW()
         WHERE user_id = $1 AND is_read = FALSE
         RETURNING id`,
        [recipientId]
    );
    return rows.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

async function findNotificationById(notificationId) {
    const { rows } = await query(
        `SELECT * FROM notifications WHERE id = $1`,
        [notificationId]
    );
    return rows[0] || null;
}

// Purpose: Cursor-paginated notifications, newest first.
async function listNotifications(recipientId, filters) {
    const conditions = [`user_id = $1`];
    const values = [recipientId];
    let i = 2;

    if (filters.isRead !== undefined) {
        conditions.push(`is_read = $${i}`);
        values.push(filters.isRead);
        i += 1;
    }
    if (filters.cursor) {
        conditions.push(`created_at < $${i}`);
        values.push(filters.cursor);
        i += 1;
    }

    values.push(filters.limit + 1);

    const { rows } = await query(
        `SELECT * FROM notifications
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${i}`,
        values
    );
    return rows;
}

// Purpose: Count unread for the bell badge — cheap COUNT query, no pagination.
async function countUnread(recipientId) {
    const { rows } = await query(
        `SELECT COUNT(*) AS count FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [recipientId]
    );
    return Number(rows[0].count);
}

module.exports = {
    createNotification,
    markNotificationRead, markAllNotificationsRead,
    findNotificationById, listNotifications, countUnread,
};
