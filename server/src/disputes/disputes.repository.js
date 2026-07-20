const { query } = require('../config/database');

async function listDisputes(filters) {
    const conditions = [];
    const values = [];
    let i = 1;

    if (filters.status) {
        conditions.push(`d.status = $${i}`);
        values.push(filters.status);
        i += 1;
    }
    if (filters.cursor) {
        conditions.push(`d.created_at < $${i}`);
        values.push(filters.cursor);
        i += 1;
    }

    values.push(filters.limit + 1);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
        `SELECT d.*,
                opener.email AS opener_email,
                resp.email   AS respondent_email,
                p.title      AS project_title
         FROM disputes d
         JOIN users opener ON opener.id = d.opened_by_id
         JOIN users resp   ON resp.id   = d.respondent_id
         JOIN projects p   ON p.id      = d.project_id
         ${where}
         ORDER BY d.created_at DESC
         LIMIT $${i}`,
        values
    );
    return rows;
}

async function findDisputeById(disputeId) {
    const { rows } = await query(
        `SELECT d.*,
                opener.email AS opener_email,
                resp.email   AS respondent_email,
                p.title      AS project_title
         FROM disputes d
         JOIN users opener ON opener.id = d.opened_by_id
         JOIN users resp   ON resp.id   = d.respondent_id
         JOIN projects p   ON p.id      = d.project_id
         WHERE d.id = $1`,
        [disputeId]
    );
    return rows[0] || null;
}

async function updateDisputeStatus(disputeId, status, extra = {}) {
    const { rows } = await query(
        `UPDATE disputes
         SET status = $2,
             resolution = COALESCE($3, resolution),
             resolved_by_id = COALESCE($4, resolved_by_id),
             resolved_at = CASE WHEN $2 IN ('resolved','closed') THEN NOW() ELSE resolved_at END,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [disputeId, status, extra.resolution ?? null, extra.resolvedById ?? null]
    );
    return rows[0] || null;
}

async function listDisputeMessages(disputeId) {
    const { rows } = await query(
        `SELECT dm.*, u.email AS sender_email
         FROM dispute_messages dm
         JOIN users u ON u.id = dm.sender_id
         WHERE dm.dispute_id = $1
         ORDER BY dm.created_at ASC`,
        [disputeId]
    );
    return rows;
}

async function createDisputeMessage(disputeId, senderId, content, isAdmin = false) {
    const { rows } = await query(
        `INSERT INTO dispute_messages (dispute_id, sender_id, content, is_admin_message)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [disputeId, senderId, content, isAdmin]
    );
    return rows[0];
}

module.exports = {
    listDisputes, findDisputeById, updateDisputeStatus,
    listDisputeMessages, createDisputeMessage,
};
