// src/modules/admin/admin.controller.js
const asyncHandler = require('../middleware/asyncHandler');
const service = require('./admin.service');

// Users
const listUsers = asyncHandler(async (req, res) => {
    const result = await service.listUsers(req.query);
    res.status(200).json({ status: 'success', data: result });
});

const getUser = asyncHandler(async (req, res) => {
    const user = await service.getUser(req.params.userId);
    res.status(200).json({ status: 'success', data: { user } });
});

const banUser = asyncHandler(async (req, res) => {
    const user = await service.banUser(req.user.id, req.params.userId, req.body.reason);
    res.status(200).json({ status: 'success', data: { user } });
});

const unbanUser = asyncHandler(async (req, res) => {
    const user = await service.unbanUser(req.user.id, req.params.userId);
    res.status(200).json({ status: 'success', data: { user } });
});

const changeRole = asyncHandler(async (req, res) => {
    const user = await service.changeRole(req.user.id, req.params.userId, req.body.role);
    res.status(200).json({ status: 'success', data: { user } });
});

// Analytics
const getSummary = asyncHandler(async (req, res) => {
    const summary = await service.getPlatformSummary();
    res.status(200).json({ status: 'success', data: { summary } });
});

const getRevenue = asyncHandler(async (req, res) => {
    const revenue = await service.getRevenueByMonth(req.query.months);
    res.status(200).json({ status: 'success', data: { revenue } });
});

const getUserGrowth = asyncHandler(async (req, res) => {
    const growth = await service.getUserGrowth(req.query.months);
    res.status(200).json({ status: 'success', data: { growth } });
});

// Audit
const listAuditLogs = asyncHandler(async (req, res) => {
    const result = await service.listAuditLogs(req.query);
    res.status(200).json({ status: 'success', data: result });
});

// Content reports
const listReports = asyncHandler(async (req, res) => {
    const result = await service.listReports(req.query);
    res.status(200).json({ status: 'success', data: result });
});

const reviewReport = asyncHandler(async (req, res) => {
    const report = await service.reviewReport(req.user.id, req.params.reportId, req.body.status);
    res.status(200).json({ status: 'success', data: { report } });
});

module.exports = {
    listUsers, getUser, banUser, unbanUser, changeRole,
    getSummary, getRevenue, getUserGrowth,
    listAuditLogs,
    listReports, reviewReport,
};
