// src/modules/admin/admin.service.js
const AppError = require('../utils/AppError');
const repo = require('./admin.repository');
const logger = require('../config/logger');

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

function toAdminUserDTO(u) {
    return {
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        emailVerified: u.email_verified,
        displayName: u.display_name ?? null,
        avatarUrl: u.avatar_url ?? null,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
    };
}

function toAuditLogDTO(al) {
    return {
        id: al.id,
        userId: al.user_id,
        adminEmail: al.admin_email ?? null,
        action: al.action,
        entityType: al.entity_type,
        entityId: al.entity_id,
        oldValue: al.old_value,
        newValue: al.new_value,
        ipAddress: al.ip_address,
        createdAt: al.created_at,
    };
}

function toReportDTO(r) {
    return {
        id: r.id,
        reporterEmail: r.reporter_email ?? null,
        entityType: r.entity_type,
        entityId: r.entity_id,
        reason: r.reason,
        description: r.description,
        status: r.status,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at,
        createdAt: r.created_at,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURSOR PAGINATION (shared pattern)
// ─────────────────────────────────────────────────────────────────────────────

function buildCursorResponse(rows, limit, keyField = 'createdAt') {
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1][keyField] : null;
    return { data, hasMore, nextCursor };
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

async function listUsers(filters) {
    const rows = await repo.listUsers(filters);
    return buildCursorResponse(rows.map(toAdminUserDTO), filters.limit);
}

async function getUser(userId) {
    const user = await repo.findUserById(userId);
    if (!user) throw new AppError('User not found.', 404);
    return toAdminUserDTO(user);
}

async function banUser(adminId, userId, reason) {
    const user = await repo.findUserById(userId);
    if (!user) throw new AppError('User not found.', 404);
    if (user.role === 'admin') throw new AppError('Cannot ban another admin.', 403);
    if (user.status === 'banned') throw new AppError('User is already banned.', 422);

    const updated = await repo.updateUserStatus(userId, 'banned');
    logger.info({ adminId, userId, reason }, 'User banned');
    return toAdminUserDTO(updated);
}

async function unbanUser(adminId, userId) {
    const user = await repo.findUserById(userId);
    if (!user) throw new AppError('User not found.', 404);
    if (user.status !== 'banned') throw new AppError('User is not banned.', 422);

    const updated = await repo.updateUserStatus(userId, 'active');
    logger.info({ adminId, userId }, 'User unbanned');
    return toAdminUserDTO(updated);
}

async function changeRole(adminId, userId, role) {
    const user = await repo.findUserById(userId);
    if (!user) throw new AppError('User not found.', 404);
    if (user.id === adminId) throw new AppError('Cannot change your own role.', 403);

    const updated = await repo.updateUserRole(userId, role);
    logger.info({ adminId, userId, oldRole: user.role, newRole: role }, 'User role changed');
    return toAdminUserDTO(updated);
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

async function getPlatformSummary() {
    const summary = await repo.getPlatformSummary();
    return {
        totalUsers: Number(summary.total_users),
        activeUsers: Number(summary.active_users),
        bannedUsers: Number(summary.banned_users),
        activeProjects: Number(summary.active_projects),
        openDisputes: Number(summary.open_disputes),
        pendingReports: Number(summary.pending_reports),
        totalRevenue: Number(summary.total_revenue),
    };
}

async function getRevenueByMonth(months) {
    const rows = await repo.getRevenueByMonth(months);
    return rows.map((r) => ({
        month: r.month,
        feeType: r.fee_type,
        transactionCount: Number(r.transaction_count),
        totalFees: Number(r.total_fees),
        avgRatePct: Number(r.avg_rate_pct),
        totalGrossVolume: Number(r.total_gross_volume),
    }));
}

async function getUserGrowth(months) {
    const rows = await repo.getUserGrowth(months);
    return rows.map((r) => ({
        month: r.month,
        role: r.role,
        count: Number(r.count),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

async function listAuditLogs(filters) {
    const rows = await repo.listAuditLogs(filters);
    return buildCursorResponse(rows.map(toAuditLogDTO), filters.limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT REPORTS
// ─────────────────────────────────────────────────────────────────────────────

async function listReports(filters) {
    const rows = await repo.listReports(filters);
    return buildCursorResponse(rows.map(toReportDTO), filters.limit);
}

async function reviewReport(adminId, reportId, status) {
    const report = await repo.findReportById(reportId);
    if (!report) throw new AppError('Report not found.', 404);
    if (report.status === 'resolved' || report.status === 'dismissed') {
        throw new AppError('Report already reviewed.', 422);
    }

    const updated = await repo.updateReportStatus(reportId, status, adminId);
    logger.info({ adminId, reportId, status }, 'Content report reviewed');
    return toReportDTO(updated);
}

module.exports = {
    listUsers, getUser, banUser, unbanUser, changeRole,
    getPlatformSummary, getRevenueByMonth, getUserGrowth,
    listAuditLogs,
    listReports, reviewReport,
};
