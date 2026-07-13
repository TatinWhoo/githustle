// src/modules/messages/messages.routes.js
const express = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const controller = require('./messages.controller');

// Simple inline schemas - messages REST endpoints are minimal
const projectIdParam = z.object({ projectId: z.string().uuid() });
const messageIdParam = z.object({ messageId: z.string().uuid() });
const historyQuery = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
});

const router = express.Router();

// NOTE: All routes mount under /api/v1/projects/:projectId/mesages
// This nests messages under their project - makes ownership self-evident from the URL

// GET /api/v1/projects/:projectId/messages
router.get(
    '/:projectId/messages',
    authenticate,
    validate(projectIdParam, 'params'),
    validate(historyQuery, 'query'),
    controller.listMessages
);

// GET  /api/v1/projects/:projectId/messages/unread
// Static 'unread' must come before /:messageId
router.get(
    '/:projectId/messages/unread',
    authenticate,
    validate(projectIdParam, 'params'),
    controller.getUnreadCount
);

// DELETE /api/v1/projects/:projectId/messages/:messageId
router.delete(
    '/:projectId/messages/:messageId',
    authenticate,
    validate(projectIdParam, 'params'),
    validate(messageIdParam, 'params'),
    controller.deleteMessage
);
module.exports = router;