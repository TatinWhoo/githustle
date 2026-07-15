// src/modules/invoices/invoices.controller.js
const asyncHandler = require('../../middleware/asyncHandler');
const service = require('./invoices.service');

// ── Invoices ────────────────────────────────────────────────────────────────

const createInvoice = asyncHandler(async (req, res) => {
    const invoice = await service.createInvoice(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { invoice } });
});

const getInvoice = asyncHandler(async (req, res) => {
    const invoice = await service.getInvoice(req.user.id, req.params.invoiceId);
    res.status(200).json({ status: 'success', data: { invoice } });
});

const updateInvoice = asyncHandler(async (req, res) => {
    const invoice = await service.updateInvoice(req.user.id, req.params.invoiceId, req.body);
    res.status(200).json({ status: 'success', data: { invoice } });
});

const updateInvoiceStatus = asyncHandler(async (req, res) => {
    const { status, paymentMethod } = req.body;
    const invoice = await service.updateInvoiceStatus(
        req.user.id, req.user.role, req.params.invoiceId, status, { paymentMethod }
    );
    res.status(200).json({ status: 'success', data: { invoice } });
});

const listInvoices = asyncHandler(async (req, res) => {
    const result = await service.listInvoices(req.user.id, req.user.role, req.query);
    res.status(200).json({ status: 'success', data: result });
});

const getInvoicePayments = asyncHandler(async (req, res) => {
    const payments = await service.getInvoicePayments(req.user.id, req.params.invoiceId);
    res.status(200).json({ status: 'success', data: { payments } });
});

// ── Time Entries ─────────────────────────────────────────────────────────────

const createTimeEntry = asyncHandler(async (req, res) => {
    const entry = await service.createTimeEntry(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { timeEntry: entry } });
});

const updateTimeEntry = asyncHandler(async (req, res) => {
    const entry = await service.updateTimeEntry(req.user.id, req.params.timeEntryId, req.body);
    res.status(200).json({ status: 'success', data: { timeEntry: entry } });
});

const submitTimeEntry = asyncHandler(async (req, res) => {
    const entry = await service.submitTimeEntry(req.user.id, req.params.timeEntryId);
    res.status(200).json({ status: 'success', data: { timeEntry: entry } });
});

const reviewTimeEntry = asyncHandler(async (req, res) => {
    const { status, rejectionNote } = req.body;
    const entry = await service.reviewTimeEntry(req.user.id, req.params.timeEntryId, status, { rejectionNote });
    res.status(200).json({ status: 'success', data: { timeEntry: entry } });
});

const deleteTimeEntry = asyncHandler(async (req, res) => {
    await service.deleteTimeEntry(req.user.id, req.params.timeEntryId);
    res.status(204).send();
});

const listTimeEntries = asyncHandler(async (req, res) => {
    const result = await service.listTimeEntries(req.user.id, req.query);
    res.status(200).json({ status: 'success', data: result });
});

const listPendingTimeEntries = asyncHandler(async (req, res) => {
    const entries = await service.listPendingTimeEntries(req.user.id, req.params.projectId);
    res.status(200).json({ status: 'success', data: { timeEntries: entries } });
});

// ── Earnings ─────────────────────────────────────────────────────────────────

const getEarningsSummary = asyncHandler(async (req, res) => {
    const summary = await service.getEarningsSummary(req.user.id);
    res.status(200).json({ status: 'success', data: { earnings: summary } });
});

const getMonthlyEarnings = asyncHandler(async (req, res) => {
    const { months = 12 } = req.query;
    const data = await service.getMonthlyEarnings(req.user.id, Number(months));
    res.status(200).json({ status: 'success', data: { monthlyEarnings: data } });
});

module.exports = {
    createInvoice, getInvoice, updateInvoice, updateInvoiceStatus, listInvoices,
    getInvoicePayments,
    createTimeEntry, updateTimeEntry, submitTimeEntry, reviewTimeEntry,
    deleteTimeEntry, listTimeEntries, listPendingTimeEntries,
    getEarningsSummary, getMonthlyEarnings,
};
