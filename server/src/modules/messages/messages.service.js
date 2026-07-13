// src/modules/messages/messages.service.js
const AppError = require('../../utils/AppError');
const repo = require('./messages.repository');
const projectsRepo = require('../projects/projects.repository');

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// Purpose: Convert raw DB rows to clean camelCase API shape.
// Strips internal fields (is_deleted) and coerces BIGINT strings to Numbers.
// ─────────────────────────────────────────────────────────────────────────────

function toMessageDTO(m) {
    return {
        id:            m.id,
        projectId:     m.project_id,
        senderId:      m.sender_id,
        senderName:    m.sender_name    || null, // from JOIN — present in listMessages, absent in single-row ops
        senderAvatar:  m.sender_avatar  || null,
        content:       m.content,
        msgType:       m.msg_type,
        fileUrl:       m.file_url,
        fileName:      m.file_name,
        fileSizeBytes: m.file_size_bytes !== null && m.file_size_bytes !== undefined
            ? Number(m.file_size_bytes) : null,
        mimeType:      m.mime_type,
        isRead:        m.is_read,
        readAt:        m.read_at,
        replyToId:     m.reply_to_id,
        replyContent:  m.reply_content   || null, // quoted message content (from LEFT JOIN on reply_to_id)
        replySenderId: m.reply_sender_id || null,
        createdAt:     m.created_at,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURSOR PAGINATION HELPER
// Purpose: Same limit+1 trick used in jobs/projects.
// For messages, list is ORDER BY created_at DESC, so the last item in the
// returned array is the OLDEST message — that becomes nextCursor.
// ─────────────────────────────────────────────────────────────────────────────

function buildCursorResponse(rows, limit) {
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    // nextCursor = createdAt of the oldest message on this page (last item in DESC list)
    const nextCursor = hasMore ? data[data.length - 1].createdAt : null;
    return { data, hasMore, nextCursor };
}

// ─────────────────────────────────────────────────────────────────────────────
// OWNERSHIP HELPER
// Purpose: Verify the user is a member (client OR freelancer) of the project.
// Reused across REST endpoints and called from socket handlers indirectly.
// Returns the project so callers don't need a second fetch.
// ─────────────────────────────────────────────────────────────────────────────

async function assertProjectMember(projectId, userId) {
    const project = await projectsRepo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    if (project.client_id !== userId && project.freelancer_id !== userId) {
        throw new AppError('Forbidden.', 403);
    }
    return project;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Fetch paginated message history — called by the REST GET endpoint
// before the socket connects (initial page load) or for lazy-loading older messages.
async function listMessages(userId, projectId, cursor, limit) {
    await assertProjectMember(projectId, userId);
    const rows = await repo.listMessages(projectId, cursor, limit);
    const mapped = rows.map(toMessageDTO);
    return buildCursorResponse(mapped, limit);
}

// Purpose: Save a new message to the DB.
// Called from the socket `send_message` handler — returns the DTO
// so the handler can emit it to the room immediately.
// Validates project membership before writing (a connected socket
// could theoretically emit send_message for a project they didn't join).
async function sendMessage(senderId, projectId, data) {
    await assertProjectMember(projectId, senderId);

    // Guard: text/system messages must have non-empty content
    if (data.msgType !== 'file' && !data.content?.trim()) {
        throw new AppError('Content is required for text messages.', 400);
    }

    // Guard: file messages must provide a fileUrl
    if (data.msgType === 'file' && !data.fileUrl) {
        throw new AppError('fileUrl is required for file messages.', 400);
    }

    const message = await repo.createMessage({
        projectId,
        senderId,
        content:       data.content       || null,
        msgType:       data.msgType        || 'text',
        fileUrl:       data.fileUrl        || null,
        fileName:      data.fileName       || null,
        fileSizeBytes: data.fileSizeBytes  || null,
        mimeType:      data.mimeType       || null,
        replyToId:     data.replyToId      || null,
    });

    // createMessage doesn't JOIN on sender info — the receiver's client already
    // knows their own name. The other party gets sender info when they load
    // history via listMessages (which does the JOIN). Return DTO as-is.
    return toMessageDTO(message);
}

// Purpose: Soft-delete a message. Sender-only.
// Called from the REST DELETE endpoint. Not a socket event — deletion is
// intentional and doesn't require sub-second delivery.
async function deleteMessage(userId, messageId) {
    const message = await repo.findMessageById(messageId);
    if (!message) throw new AppError('Message not found.', 404);
    if (message.sender_id !== userId) throw new AppError('Forbidden.', 403);
    if (message.is_deleted) throw new AppError('Message already deleted.', 422);

    await repo.softDeleteMessage(messageId);
}

// Purpose: Mark all unread messages in a project as read.
// Called from the socket `mark_read` event when the user opens the chat panel.
// Returns the IDs of messages that were just marked — the socket handler
// emits them to the other party so they can update their "Seen" indicators.
async function markRead(userId, projectId) {
    await assertProjectMember(projectId, userId);
    const marked = await repo.markMessagesRead(projectId, userId);
    return marked.map((r) => r.id); // array of message IDs that were just marked
}

// Purpose: Get unread count for a project — drives the notification badge.
async function getUnreadCount(userId, projectId) {
    await assertProjectMember(projectId, userId);
    return repo.countUnread(projectId, userId);
}

module.exports = {
    listMessages, sendMessage, deleteMessage, markRead, getUnreadCount,
};
