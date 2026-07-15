// src/modules/invoices/invoices.service.js
const AppError = require('../../utils/AppError');
const repo = require('./invoices.repository');
const projectsRepo = require('../projects/projects.repository');

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

function toInvoiceDTO(inv, items = []) {
    return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        projectId: inv.project_id,
        projectTitle: inv.project_title || null,  // from JOIN in list queries
        milestoneId: inv.milestone_id,
        freelancerId: inv.freelancer_id,
        clientId: inv.client_id,
        subtotal: Number(inv.subtotal),
        taxRate: Number(inv.tax_rate),
        taxAmount: Number(inv.tax_amount),
        totalAmount: Number(inv.total_amount),
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.due_date,
        notes: inv.notes,
        terms: inv.terms,
        sentAt: inv.sent_at,
        paidAt: inv.paid_at,
        reminderCount: inv.reminder_count,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
        items: items.map(toInvoiceItemDTO),
    };
}

function toInvoiceItemDTO(item) {
    return {
        id: item.id,
        invoiceId: item.invoice_id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        amount: Number(item.amount),
        orderIndex: item.order_index,
    };
}

function toPaymentDTO(p) {
    return {
        id: p.id,
        invoiceId: p.invoice_id,
        payerId: p.payer_id,
        payeeId: p.payee_id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paymentMethod: p.payment_method,
        externalPaymentId: p.external_payment_id,
        failureReason: p.failure_reason,
        paymentType: p.payment_type,
        completedAt: p.completed_at,
        createdAt: p.created_at,
    };
}

function toTimeEntryDTO(te) {
    return {
        id: te.id,
        projectId: te.project_id,
        projectTitle: te.project_title || null,
        freelancerId: te.freelancer_id,
        milestoneId: te.milestone_id,
        description: te.description,
        startTime: te.start_time,
        endTime: te.end_time,
        hours: te.hours !== null ? Number(te.hours) : null,
        isBillable: te.is_billable,
        status: te.status,
        submittedAt: te.submitted_at,
        approvedById: te.approved_by_id,
        approvedAt: te.approved_at,
        rejectionNote: te.rejection_note,
        invoiceId: te.invoice_id,
        createdAt: te.created_at,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURSOR PAGINATION HELPER (same pattern as M3/M4/M5)
// ─────────────────────────────────────────────────────────────────────────────

function buildCursorResponse(rows, limit, keyField = 'createdAt') {
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1][keyField] : null;
    return { data, hasMore, nextCursor };
}

// ─────────────────────────────────────────────────────────────────────────────
// AMOUNT COMPUTATION HELPER
// Purpose: Compute subtotal, taxAmount, totalAmount from items + taxRate.
// Done server-side to prevent client-side floating point drift.
// Uses toFixed(2) to ensure DB NUMERIC(12,2) precision match.
// ─────────────────────────────────────────────────────────────────────────────

function computeAmounts(items, taxRate) {
    const subtotal = items.reduce((sum, item) => {
        return sum + +(item.quantity * item.unitPrice).toFixed(2);
    }, 0);
    const taxAmount = +(subtotal * (taxRate / 100)).toFixed(2);
    const totalAmount = +(subtotal + taxAmount).toFixed(2);
    return { subtotal, taxAmount, totalAmount };
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Create an invoice. Freelancer-only.
// Guards: project must exist, user must be the freelancer on that project.
async function createInvoice(freelancerId, data) {
    const project = await projectsRepo.findProjectById(data.projectId);
    if (!project) throw new AppError('Project not found.', 404);
    if (project.freelancer_id !== freelancerId) throw new AppError('Forbidden.', 403);

    const computedAmounts = computeAmounts(data.items, data.taxRate);

    const result = await repo.createInvoice(
        {
            ...data,
            freelancerId,
            clientId: project.client_id,
        },
        data.items,
        computedAmounts
    );

    return toInvoiceDTO(result, result.items);
}

// Purpose: Get a single invoice with items. Both project members can view.
async function getInvoice(userId, invoiceId) {
    const invoice = await repo.findInvoiceById(invoiceId);
    if (!invoice) throw new AppError('Invoice not found.', 404);
    if (invoice.freelancer_id !== userId && invoice.client_id !== userId) {
        throw new AppError('Forbidden.', 403);
    }
    const items = await repo.listInvoiceItems(invoiceId);
    return toInvoiceDTO(invoice, items);
}

// Purpose: Update a draft invoice. Freelancer-only, draft-only.
async function updateInvoice(freelancerId, invoiceId, data) {
    const invoice = await repo.findInvoiceById(invoiceId);
    if (!invoice) throw new AppError('Invoice not found.', 404);
    if (invoice.freelancer_id !== freelancerId) throw new AppError('Forbidden.', 403);
    if (invoice.status !== 'draft') throw new AppError('Only draft invoices can be edited.', 422);

    let computedAmounts = null;
    if (data.items) {
        // If items are provided, recompute amounts and replace all items
        const taxRate = data.taxRate ?? Number(invoice.tax_rate);
        computedAmounts = computeAmounts(data.items, taxRate);
        await repo.replaceInvoiceItems(invoiceId, data.items);
    } else if (data.taxRate !== undefined) {
        // If only taxRate changed, recompute from existing items
        const existingItems = await repo.listInvoiceItems(invoiceId);
        const itemsForCalc = existingItems.map(it => ({
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
        }));
        computedAmounts = computeAmounts(itemsForCalc, data.taxRate);
    }

    const updated = await repo.updateInvoice(invoiceId, data, computedAmounts);
    const items = await repo.listInvoiceItems(invoiceId);
    return toInvoiceDTO(updated, items);
}

// Purpose: Transition invoice status with role-based guards.
// Status machine:
//   Freelancer: draft → sent, draft → cancelled
//   Client:     sent → paid, sent → disputed
//   System:     sent → overdue (BullMQ)
async function updateInvoiceStatus(userId, userRole, invoiceId, status, extra = {}) {
    const invoice = await repo.findInvoiceById(invoiceId);
    if (!invoice) throw new AppError('Invoice not found.', 404);
    if (invoice.freelancer_id !== userId && invoice.client_id !== userId) {
        throw new AppError('Forbidden.', 403);
    }

    const current = invoice.status;

    // Transition validation
    const TRANSITIONS = {
        draft: { sent: 'freelancer', cancelled: 'freelancer' },
        sent: { paid: 'client', disputed: 'client', overdue: 'system' },
    };

    const allowedNext = TRANSITIONS[current];
    if (!allowedNext || !(status in allowedNext)) {
        throw new AppError(`Cannot transition invoice from '${current}' to '${status}'.`, 422);
    }

    const requiredRole = allowedNext[status];
    if (requiredRole !== 'system' && userRole !== requiredRole) {
        throw new AppError(`Only the ${requiredRole} can set invoice status to '${status}'.`, 403);
    }

    const updated = await repo.updateInvoiceStatus(invoiceId, status);

    // When client marks as paid → create a payment record
    if (status === 'paid') {
        await repo.createPayment({
            invoiceId,
            payerId: invoice.client_id,
            payeeId: invoice.freelancer_id,
            amount: invoice.total_amount,
            paymentMethod: extra.paymentMethod || 'manual',
            paymentType: 'charge',
            status: 'completed', // Direct payment — no external gateway
        });
    }

    const items = await repo.listInvoiceItems(invoiceId);
    return toInvoiceDTO(updated, items);
}

// Purpose: List invoices for the current user.
async function listInvoices(userId, role, filters) {
    const rows = await repo.listInvoices(userId, role, filters);
    // Don't fetch items for list view — too expensive
    const mapped = rows.map((inv) => toInvoiceDTO(inv));
    return buildCursorResponse(mapped, filters.limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Get payments on an invoice. Both parties can view.
async function getInvoicePayments(userId, invoiceId) {
    const invoice = await repo.findInvoiceById(invoiceId);
    if (!invoice) throw new AppError('Invoice not found.', 404);
    if (invoice.freelancer_id !== userId && invoice.client_id !== userId) {
        throw new AppError('Forbidden.', 403);
    }
    const payments = await repo.findPaymentsByInvoice(invoiceId);
    return payments.map(toPaymentDTO);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME ENTRY SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Create a time entry. Freelancer-only.
async function createTimeEntry(freelancerId, data) {
    const project = await projectsRepo.findProjectById(data.projectId);
    if (!project) throw new AppError('Project not found.', 404);
    if (project.freelancer_id !== freelancerId) throw new AppError('Forbidden.', 403);
    if (project.budget_type !== 'hourly') {
        throw new AppError('Time entries can only be created for hourly projects.', 422);
    }

    // Auto-compute hours from start/end if both provided and hours not explicitly set
    let hours = data.hours;
    if (!hours && data.endTime) {
        const diff = (new Date(data.endTime) - new Date(data.startTime)) / 3600000;
        hours = +diff.toFixed(2);
        if (hours <= 0) throw new AppError('endTime must be after startTime.', 400);
    }

    const entry = await repo.createTimeEntry({
        ...data,
        freelancerId,
        hours,
    });
    return toTimeEntryDTO(entry);
}

// Purpose: Update a draft time entry. Freelancer-only.
async function updateTimeEntry(freelancerId, timeEntryId, data) {
    const entry = await repo.findTimeEntryById(timeEntryId);
    if (!entry) throw new AppError('Time entry not found.', 404);
    if (entry.freelancer_id !== freelancerId) throw new AppError('Forbidden.', 403);
    if (entry.status !== 'draft') throw new AppError('Only draft time entries can be edited.', 422);

    const updated = await repo.updateTimeEntry(timeEntryId, data);
    return toTimeEntryDTO(updated);
}

// Purpose: Freelancer submits a time entry for approval.
async function submitTimeEntry(freelancerId, timeEntryId) {
    const entry = await repo.findTimeEntryById(timeEntryId);
    if (!entry) throw new AppError('Time entry not found.', 404);
    if (entry.freelancer_id !== freelancerId) throw new AppError('Forbidden.', 403);
    if (entry.status !== 'draft') throw new AppError('Only draft time entries can be submitted.', 422);
    if (entry.hours === null) throw new AppError('Hours must be set before submitting.', 422);

    const updated = await repo.updateTimeEntryStatus(timeEntryId, 'submitted');
    return toTimeEntryDTO(updated);
}

// Purpose: Client approves or rejects a submitted time entry.
async function reviewTimeEntry(clientId, timeEntryId, status, extra = {}) {
    const entry = await repo.findTimeEntryById(timeEntryId);
    if (!entry) throw new AppError('Time entry not found.', 404);

    // Verify the client owns the project this time entry belongs to
    const project = await projectsRepo.findProjectById(entry.project_id);
    if (!project || project.client_id !== clientId) throw new AppError('Forbidden.', 403);
    if (entry.status !== 'submitted') throw new AppError('Only submitted time entries can be reviewed.', 422);

    const updated = await repo.updateTimeEntryStatus(timeEntryId, status, {
        approvedById: status === 'approved' ? clientId : undefined,
        rejectionNote: extra.rejectionNote,
    });
    return toTimeEntryDTO(updated);
}

// Purpose: Delete a draft time entry. Freelancer-only.
async function deleteTimeEntry(freelancerId, timeEntryId) {
    const entry = await repo.findTimeEntryById(timeEntryId);
    if (!entry) throw new AppError('Time entry not found.', 404);
    if (entry.freelancer_id !== freelancerId) throw new AppError('Forbidden.', 403);
    if (entry.status !== 'draft') throw new AppError('Only draft time entries can be deleted.', 422);
    await repo.deleteTimeEntry(timeEntryId);
}

// Purpose: List time entries for a freelancer.
async function listTimeEntries(freelancerId, filters) {
    const rows = await repo.listTimeEntries(freelancerId, filters);
    const mapped = rows.map(toTimeEntryDTO);
    return buildCursorResponse(mapped, filters.limit);
}

// Purpose: List pending time entries on a specific project (for client review).
async function listPendingTimeEntries(clientId, projectId) {
    const project = await projectsRepo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    if (project.client_id !== clientId) throw new AppError('Forbidden.', 403);

    const rows = await repo.listPendingTimeEntries(clientId, projectId);
    return rows.map(toTimeEntryDTO);
}

// ─────────────────────────────────────────────────────────────────────────────
// EARNINGS DASHBOARD SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Get aggregated earnings summary from the v_freelancer_earnings view.
async function getEarningsSummary(freelancerId) {
    const earnings = await repo.getFreelancerEarnings(freelancerId);
    if (!earnings) throw new AppError('Freelancer profile not found.', 404);
    return {
        displayName: earnings.display_name,
        totalEarned: Number(earnings.total_earned),
        jobsCompleted: Number(earnings.jobs_completed),
        averageRating: earnings.average_rating !== null ? Number(earnings.average_rating) : null,
        totalReviews: Number(earnings.total_reviews),
        activeProjects: Number(earnings.active_projects),
        overdueInvoices: Number(earnings.overdue_invoices),
        pendingInvoiceTotal: Number(earnings.pending_invoice_total),
    };
}

// Purpose: Monthly earnings chart data.
async function getMonthlyEarnings(freelancerId, months = 12) {
    const rows = await repo.getMonthlyEarnings(freelancerId, months);
    return rows.map((r) => ({
        month: r.month,
        total: Number(r.total),
    }));
}

module.exports = {
    createInvoice, getInvoice, updateInvoice, updateInvoiceStatus, listInvoices,
    getInvoicePayments,
    createTimeEntry, updateTimeEntry, submitTimeEntry, reviewTimeEntry,
    deleteTimeEntry, listTimeEntries, listPendingTimeEntries,
    getEarningsSummary, getMonthlyEarnings,
};
