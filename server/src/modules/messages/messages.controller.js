// src/modules/messages/messages.controller.js
// REST-only controller — only 3 endpoints:
//   GET  /:projectId/messages  → history (before socket connects)
//   DELETE /:projectId/messages/:messageId → soft-delete
//   GET  /:projectId/messages/unread → unread count for badge
// All real-time operations (send, typing, read receipt) are socket events.

const asyncHandler = require('../../middleware/asyncHandler');
const service = require('./messages.service');

const listMessages = asyncHandler(async (req, res) => {
    const { cursor, limit = 30 } = req.query;
    const result = await service.listMessages(
        req.user.id,
        req.params.projectId,
        cursor,
        Number(limit)
    );
    res.status(200).json({ status: 'success', data: result });
});

const deleteMessage = asyncHandler(async (req, res) => {
    await service.deleteMessage(req.user.id, req.params.messageId);
    res.status(204).send();
});

const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await service.getUnreadCount(req.user.id, req.params.projectId);
    res.status(200).json({ status: 'success', data: { count } });
});

module.exports = { listMessages, deleteMessage, getUnreadCount };