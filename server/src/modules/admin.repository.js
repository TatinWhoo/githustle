// src/modules/admin/admin.repository.js
const { query } = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

async function listUsers(filters) {
    const conditions = [];
    const values = [];
    let i = 1;

    if (filters.role) {
        conditions.push(`u.role = $${i}`);
        values.push(filters.role);
        i += 1;
    }
    if (filters.status) {
        conditions.push(`u.status = $${i}`);
        values.push(filters.status);
        i += 1;
    }
    if (filters.search) {
        conditions.push(`(u.email ILIKE $${i} OR p.display_name ILIKE $${i})`);
        values.push(`%${filters.search}%`);
        i += 1;
    }
    if (filters.cursor) {
        conditions.push(`u.created_at < $${i}`);
        values.push(filters.cursor);
        i += 1;
    }

    values.push(filters.limit + 1);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
        `SELECT u.id, u.email, u.role, u.status, u.email_verified,
                u.created_at, u.updated_at,
                p.display_name, p.avatar_url
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $${i}`,
        values
    );
    return rows;
}

async function findUserById(userId) {
    const { rows } = await query(
        `SELECT u.*, p.display_name, p.avatar_url, p.bio
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = $1`,
        [userId]
    );
    return rows[0] || null;
}

async function updateUserStatus(userId, status) {
    const { rows } = await query(
        `UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [userId, status]
    );
    return rows[0] || null;
}

async function updateUserRole(userId, role) {
    const { rows } = await query(
        `UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [userId, role]
    );
    return rows[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

// Revenue from the pre-built v_platform_revenue view
async function getRevenueByMonth(months = 12) {
    const { rows } = await query(
        `SELECT * FROM v_platform_revenue
         WHERE month >= DATE_TRUNC('month', NOW()) - INTERVAL '${months} months'
         ORDER BY month DESC, fee_type`
    );
    return rows;
}

// User growth: signups per month
async function getUserGrowth(months = 12) {
    const { rows } = await query(
        `SELECT DATE_TRUNC('month', created_at) AS month,
                role, COUNT(*) AS count
         FROM users
         WHERE created_at >= NOW() - INTERVAL '${months} months'
         GROUP BY month, role
         ORDER BY month DESC`
    );
    return rows;
}

// Platform summary — counts for the admin dashboard cards
async function getPlatformSummary() {
    const { rows } = await query(`
        SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
            (SELECT COUNT(*) FROM users WHERE status = 'banned') AS banned_users,
            (SELECT COUNT(*) FROM projects WHERE status = 'active') AS active_projects,
            (SELECT COUNT(*) FROM disputes WHERE status IN ('open', 'under_review')) AS open_disputes,
            (SELECT COUNT(*) FROM content_reports WHERE status = 'pending') AS pending_reports,
            (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_fees) AS total_revenue
    `);
    return rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

async function listAuditLogs(filters) {
    const conditions = [];
    const values = [];
    let i = 1;

    if (filters.userId) {
        conditions.push(`al.user_id = $${i}`);
        values.push(filters.userId);
        i += 1;
    }
    if (filters.action) {
        conditions.push(`al.action = $${i}`);
        values.push(filters.action);
        i += 1;
    }
    if (filters.entityType) {
        conditions.push(`al.entity_type = $${i}`);
        values.push(filters.entityType);
        i += 1;
    }
    if (filters.cursor) {
        conditions.push(`al.created_at < $${i}`);
        values.push(filters.cursor);
        i += 1;
    }

    values.push(filters.limit + 1);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
        `SELECT al.*, u.email AS admin_email
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT $${i}`,
        values
    );
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT REPORTS
// ─────────────────────────────────────────────────────────────────────────────

async function listReports(filters) {
    const conditions = [];
    const values = [];
    let i = 1;

    if (filters.status) {
        conditions.push(`cr.status = $${i}`);
        values.push(filters.status);
        i += 1;
    }
    if (filters.cursor) {
        conditions.push(`cr.created_at < $${i}`);
        values.push(filters.cursor);
        i += 1;
    }

    values.push(filters.limit + 1);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
        `SELECT cr.*, u.email AS reporter_email
         FROM content_reports cr
         LEFT JOIN users u ON u.id = cr.reporter_id
         ${where}
         ORDER BY cr.created_at DESC
         LIMIT $${i}`,
        values
    );
    return rows;
}

async function findReportById(reportId) {
    const { rows } = await query(
        `SELECT cr.*, u.email AS reporter_email
         FROM content_reports cr
         LEFT JOIN users u ON u.id = cr.reporter_id
         WHERE cr.id = $1`,
        [reportId]
    );
    return rows[0] || null;
}

async function updateReportStatus(reportId, status, reviewedBy) {
    const { rows } = await query(
        `UPDATE content_reports
         SET status = $2, reviewed_by = $3, reviewed_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [reportId, status, reviewedBy]
    );
    return rows[0] || null;
}

module.exports = {
    listUsers, findUserById, updateUserStatus, updateUserRole,
    getRevenueByMonth, getUserGrowth, getPlatformSummary,
    listAuditLogs,
    listReports, findReportById, updateReportStatus,
};

