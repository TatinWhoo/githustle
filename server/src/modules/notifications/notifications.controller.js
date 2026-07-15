// src/modules/notifications/notifications.controller.js
const asyncHandler = require('../../middleware/asyncHandler');
const service = require('./notifications.service');

const listNotifications = asyncHandler(async (req, res) => {
    const result = await service.listNotifications(req.user.id, req.query);
    res.status(200).json({ status: 'success', data: result });
});

const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await service.getUnreadCount(req.user.id);
    res.status(200).json({ status: 'success', data: { count } });
});

const markRead = asyncHandler(async (req, res) => {
    const notif = await service.markRead(req.user.id, req.params.notificationId);
    res.status(200).json({ status: 'success', data: { notification: notif } });
});

const markAllRead = asyncHandler(async (req, res) => {
    const result = await service.markAllRead(req.user.id);
    res.status(200).json({ status: 'success', data: result });
});

module.exports = { listNotifications, getUnreadCount, markRead, markAllRead };
