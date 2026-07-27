// src/modules/admin/admin.validation.js
const { z } = require('zod');

// ── User management ──────────────────────────────────────────────────────────

const userIdParamSchema = z.object({
    userId: z.string().uuid('Invalid User ID'),
});

const listUsersQuerySchema = z.object({
    role: z.enum(['client', 'freelancer', 'admin']).optional(),
    status: z.enum(['active', 'suspended', 'banned']).optional(),
    search: z.string().trim().max(100).optional(),  // email or name search
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const changeRoleSchema = z.object({
    role: z.enum(['client', 'freelancer', 'admin']),
});

const banUserSchema = z.object({
    reason: z.string().trim().min(5).max(500),
});

// ── Audit logs ────────────────────────────────────────────────────────────────

const listAuditLogsQuerySchema = z.object({
    userId: z.string().uuid().optional(),
    action: z.string().max(100).optional(),
    entityType: z.string().max(50).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Platform analytics ───────────────────────────────────────────────────────

const analyticsQuerySchema = z.object({
    months: z.coerce.number().int().min(1).max(24).default(12),
});

// ── Content reports ──────────────────────────────────────────────────────────

const reportIdParamSchema = z.object({
    reportId: z.string().uuid('Invalid Report ID'),
});

const reviewReportSchema = z.object({
    status: z.enum(['under_review', 'resolved', 'dismissed']),
});

const listReportsQuerySchema = z.object({
    status: z.enum(['pending', 'under_review', 'resolved', 'dismissed']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
    userIdParamSchema, listUsersQuerySchema, changeRoleSchema, banUserSchema,
    listAuditLogsQuerySchema, analyticsQuerySchema,
    reportIdParamSchema, reviewReportSchema, listReportsQuerySchema,
};
