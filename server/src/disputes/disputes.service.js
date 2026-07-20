const AppError = require('../utils/AppError');
const repo = require('./disputes.repository');
const logger = require('../config/logger');

function toDisputeDTO(d) {
    return {
        id: d.id,
        projectId: d.project_id,
        projectTitle: d.project_title ?? null,
        openerEmail: d.opener_email ?? null,
        respondentEmail: d.respondent_email ?? null,
        reason: d.reason,
        description: d.description,
        status: d.status,
        resolution: d.resolution,
        resolvedAt: d.resolved_at,
        isPriority: d.is_priority,
        slaDeadline: d.sla_deadline,
        createdAt: d.created_at,
    };
}

function toMessageDTO(m) {
    return {
        id: m.id,
        disputeId: m.dispute_id,
        senderEmail: m.sender_email ?? null,
        content: m.content,
        isAdminMessage: m.is_admin_message,
        createdAt: m.created_at,
    };
}

function buildCursorResponse(rows, limit, keyField = 'createdAt') {
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1][keyField] : null;
    return { data, hasMore, nextCursor };
}

async function listDisputes(filters) {
    const rows = await repo.listDisputes(filters);
    return buildCursorResponse(rows.map(toDisputeDTO), filters.limit);
}

async function getDispute(disputeId) {
    const dispute = await repo.findDisputeById(disputeId);
    if (!dispute) throw new AppError('Dispute not found.', 404);
    return toDisputeDTO(dispute);
}

async function assignToAdmin(adminId, disputeId) {
    const dispute = await repo.findDisputeById(disputeId);
    if (!dispute) throw new AppError('Dispute not found.', 404);
    if (dispute.status !== 'open') throw new AppError('Only open disputes can be assigned.', 422);

    const updated = await repo.updateDisputeStatus(disputeId, 'under_review', { resolvedById: adminId });
    logger.info({ adminId, disputeId }, 'Dispute assigned to admin');
    return toDisputeDTO(updated);
}

async function resolveDispute(adminId, disputeId, resolution) {
    const dispute = await repo.findDisputeById(disputeId);
    if (!dispute) throw new AppError('Dispute not found.', 404);
    if (dispute.status === 'resolved' || dispute.status === 'closed') {
        throw new AppError('Dispute already resolved.', 422);
    }

    const updated = await repo.updateDisputeStatus(disputeId, 'resolved', {
        resolution,
        resolvedById: adminId,
    });
    logger.info({ adminId, disputeId }, 'Dispute resolved');
    return toDisputeDTO(updated);
}

async function getMessages(disputeId) {
    const dispute = await repo.findDisputeById(disputeId);
    if (!dispute) throw new AppError('Dispute not found.', 404);
    const rows = await repo.listDisputeMessages(disputeId);
    return rows.map(toMessageDTO);
}

async function addAdminMessage(adminId, disputeId, content) {
    const dispute = await repo.findDisputeById(disputeId);
    if (!dispute) throw new AppError('Dispute not found.', 404);
    const msg = await repo.createDisputeMessage(disputeId, adminId, content, true);
    return toMessageDTO(msg);
}

module.exports = {
    listDisputes, getDispute, assignToAdmin, resolveDispute,
    getMessages, addAdminMessage,
};
