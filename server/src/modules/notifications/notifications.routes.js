// src/modules/notifications/notifications.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const controller = require('./notifications.controller');
const {
    notificationIdParamSchema,
    listNotificationsQuerySchema,
} = require('./notifications.validation');

const router = express.Router();

// Static routes FIRST (before /:notificationId)

// GET /api/v1/notifications/unread-count
router.get('/unread-count', authenticate, controller.getUnreadCount);

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', authenticate, controller.markAllRead);

// GET /api/v1/notifications
router.get(
    '/',
    authenticate,
    validate(listNotificationsQuerySchema, 'query'),
    controller.listNotifications
);

// PATCH /api/v1/notifications/:notificationId/read
router.patch(
    '/:notificationId/read',
    authenticate,
    validate(notificationIdParamSchema, 'params'),
    controller.markRead
);

module.exports = router;
