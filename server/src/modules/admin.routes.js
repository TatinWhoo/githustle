// src/modules/admin/admin.routes.js
const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLog');
const controller = require('./admin.controller');
const {
    userIdParamSchema, listUsersQuerySchema, changeRoleSchema, banUserSchema,
    listAuditLogsQuerySchema, analyticsQuerySchema,
    reportIdParamSchema, reviewReportSchema, listReportsQuerySchema,
} = require('./admin.validation');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

// ── User Management ──────────────────────────────────────────────────────────

router.get('/users',
    validate(listUsersQuerySchema, 'query'),
    controller.listUsers);

router.get('/users/:userId',
    validate(userIdParamSchema, 'params'),
    controller.getUser);

router.patch('/users/:userId/ban',
    validate(userIdParamSchema, 'params'),
    validate(banUserSchema),
    auditLog('user.ban', 'user', (req) => req.params.userId),
    controller.banUser);

router.patch('/users/:userId/unban',
    validate(userIdParamSchema, 'params'),
    auditLog('user.unban', 'user', (req) => req.params.userId),
    controller.unbanUser);

router.patch('/users/:userId/role',
    validate(userIdParamSchema, 'params'),
    validate(changeRoleSchema),
    auditLog('user.change_role', 'user', (req) => req.params.userId),
    controller.changeRole);

// ── Platform Analytics ───────────────────────────────────────────────────────

router.get('/analytics/summary', controller.getSummary);
router.get('/analytics/revenue',
    validate(analyticsQuerySchema, 'query'),
    controller.getRevenue);
router.get('/analytics/user-growth',
    validate(analyticsQuerySchema, 'query'),
    controller.getUserGrowth);

// ── Audit Logs ───────────────────────────────────────────────────────────────

router.get('/audit-logs',
    validate(listAuditLogsQuerySchema, 'query'),
    controller.listAuditLogs);

// ── Content Reports ──────────────────────────────────────────────────────────

router.get('/reports',
    validate(listReportsQuerySchema, 'query'),
    controller.listReports);

router.patch('/reports/:reportId/review',
    validate(reportIdParamSchema, 'params'),
    validate(reviewReportSchema),
    auditLog('report.review', 'content_report', (req) => req.params.reportId),
    controller.reviewReport);

module.exports = router;
