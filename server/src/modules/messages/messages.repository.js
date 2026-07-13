// src/modules/messages/messages.repository.js
const { query } = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// WRITE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Insert a new message row.
// DB CHECK constraint `chk_message_content` enforces:
//   - text/system: content must not be null
//   - file: file_url must not be null
// We don't validate that here — the DB rejects invalid combos automatically.
// RETURNING * so we get the id + created_at without a second SELECT.
async function createMessage(data) {
    const {
        projectId, senderId, content, msgType,
        fileUrl, fileName, fileSizeBytes, mimeType, replyToId,
    } = data;

    const { rows } = await query(
        `INSERT INTO messages
       (project_id, sender_id, content, msg_type,
        file_url, file_name, file_size_bytes, mime_type, reply_to_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
        [
            projectId, senderId,
            content ?? null,
            msgType,
            fileUrl ?? null, fileName ?? null,
            fileSizeBytes ?? null, mimeType ?? null,
            replyToId ?? null,
        ]
    );
    return rows[0];
}

// Purpose: Soft-delete a message — sets is_deleted = TRUE.
// Why soft-delete? Maintains message thread integrity (reply_to_id references
// survive), and lets clients show "This message was deleted" instead of a gap.
// Returns the updated row so the controller can confirm deletion.
async function softDeleteMessage(messageId) {
    const { rows } = await query(
        `UPDATE messages SET is_deleted = TRUE WHERE id = $1 RETURNING *`,
        [messageId]
    );
    return rows[0] || null;
}

// Purpose: Mark messages in a project as read by a specific user.
// We update ALL unread messages in the project that were NOT sent by this user
// (you can't mark your own messages as "read by you" — that's nonsensical).
// `read_at = NOW()` records exactly when the read happened.
// We also check `is_read = FALSE` to make this idempotent (safe to call twice).
async function markMessagesRead(projectId, userId) {
    const { rows } = await query(
        `UPDATE messages
     SET is_read = TRUE, read_at = NOW()
     WHERE project_id = $1
       AND sender_id  != $2
       AND is_read     = FALSE
       AND is_deleted  = FALSE
     RETURNING id`,
        [projectId, userId]
    );
    return rows; // returns which message IDs were marked (for emitting back)
}

// ─────────────────────────────────────────────────────────────────────────────
// READ OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Cursor-paginated message history for a project room.
// ORDER BY created_at DESC → newest messages first (standard chat UX).
// Cursor = created_at of the oldest message on the current page.
// On next page, fetch messages OLDER than the cursor.
// LEFT JOIN on reply_to fetches the replied-to message's content in one query
// so the UI can render the quote bubble without a second round-trip.
async function listMessages(projectId, cursor, limit) {
    const conditions = [`m.project_id = $1`, `m.is_deleted = FALSE`];
    const values = [projectId];
    let i = 2;

    if (cursor) {
        // cursor = ISO timestamp of the oldest message on the current page
        conditions.push(`m.created_at < $${i}`);
        values.push(cursor);
        i += 1;
    }

    values.push(limit + 1); // fetch limit+1 to detect hasMore

    const { rows } = await query(
        `SELECT
       m.id, m.project_id, m.sender_id, m.content,
       m.msg_type, m.file_url, m.file_name, m.file_size_bytes, m.mime_type,
       m.is_read, m.read_at, m.reply_to_id, m.created_at,
       -- Inline sender info to avoid extra calls from the frontend
       u.display_name AS sender_name,
       u.avatar_url   AS sender_avatar,
       -- Quoted message for reply threads
       r.content      AS reply_content,
       r.sender_id    AS reply_sender_id
     FROM messages m
     JOIN (
       -- Subquery joins both profile types into one display_name + avatar_url.
       -- A user is either a client or freelancer — COALESCE picks whichever is non-null.
       SELECT u.id,
         COALESCE(fp.display_name, cp.display_name) AS display_name,
         COALESCE(fp.avatar_url,   cp.avatar_url)   AS avatar_url
       FROM users u
       LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
       LEFT JOIN client_profiles     cp ON cp.user_id = u.id
     ) u ON u.id = m.sender_id
     LEFT JOIN messages r ON r.id = m.reply_to_id -- the quoted message
     WHERE ${conditions.join(' AND ')}
     ORDER BY m.created_at DESC
     LIMIT $${i}`,
        values
    );
    return rows;
}

// Purpose: Get a single message by id (for ownership check before delete).
async function findMessageById(messageId) {
    const { rows } = await query(
        `SELECT * FROM messages WHERE id = $1`,
        [messageId]
    );
    return rows[0] || null;
}

// Purpose: Count unread messages in a project for a given user.
// Used to update the unread badge when a user opens the chat.
// Uses the partial index `idx_msg_unread` for performance.
async function countUnread(projectId, userId) {
    const { rows } = await query(
        `SELECT COUNT(*) AS count
     FROM messages
     WHERE project_id = $1
       AND sender_id  != $2
       AND is_read     = FALSE
       AND is_deleted  = FALSE`,
        [projectId, userId]
    );
    return Number(rows[0].count);
}

module.exports = {
    createMessage, softDeleteMessage, markMessagesRead,
    listMessages, findMessageById, countUnread,
};
