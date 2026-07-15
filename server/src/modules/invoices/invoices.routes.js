// src/modules/invoices/invoices.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const controller = require('./invoices.controller');
const {
    invoiceIdParamSchema,
    timeEntryIdParamSchema,
    projectIdParamSchema,
    createInvoiceSchema,
    updateInvoiceSchema,
    updateInvoiceStatusSchema,
    createTimeEntrySchema,
    updateTimeEntrySchema,
    reviewTimeEntrySchema,
    listInvoicesQuerySchema,
    listTimeEntriesQuerySchema,
} = require('./invoices.validation');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE ROUTES — mount at /api/v1/invoices
// ─────────────────────────────────────────────────────────────────────────────

// Static routes FIRST (before /:invoiceId)

// Freelancer earnings dashboard
router.get(
    '/earnings',
    authenticate,
    requireRole('freelancer'),
    controller.getEarningsSummary
);

router.get(
    '/earnings/monthly',
    authenticate,
    requireRole('freelancer'),
    controller.getMonthlyEarnings
);

// List invoices (both roles — service filters by role)
router.get(
    '/',
    authenticate,
    validate(listInvoicesQuerySchema, 'query'),
    controller.listInvoices
);

// Create invoice (freelancer only)
router.post(
    '/',
    authenticate,
    requireRole('freelancer'),
    validate(createInvoiceSchema),
    controller.createInvoice
);

// Dynamic /:invoiceId routes
router.get(
    '/:invoiceId',
    authenticate,
    validate(invoiceIdParamSchema, 'params'),
    controller.getInvoice
);

router.put(
    '/:invoiceId',
    authenticate,
    requireRole('freelancer'),
    validate(invoiceIdParamSchema, 'params'),
    validate(updateInvoiceSchema),
    controller.updateInvoice
);

router.patch(
    '/:invoiceId/status',
    authenticate,
    validate(invoiceIdParamSchema, 'params'),
    validate(updateInvoiceStatusSchema),
    controller.updateInvoiceStatus
);

router.get(
    '/:invoiceId/payments',
    authenticate,
    validate(invoiceIdParamSchema, 'params'),
    controller.getInvoicePayments
);

// ─────────────────────────────────────────────────────────────────────────────
// TIME ENTRY ROUTES — mount at /api/v1/time-entries
// Separated into a second router to mount on a different base path.
// ─────────────────────────────────────────────────────────────────────────────

const timeRouter = express.Router();

// List own time entries (freelancer)
timeRouter.get(
    '/',
    authenticate,
    requireRole('freelancer'),
    validate(listTimeEntriesQuerySchema, 'query'),
    controller.listTimeEntries
);

// Create a time entry (freelancer)
timeRouter.post(
    '/',
    authenticate,
    requireRole('freelancer'),
    validate(createTimeEntrySchema),
    controller.createTimeEntry
);

// List pending time entries for a project (client review view)
timeRouter.get(
    '/pending/:projectId',
    authenticate,
    requireRole('client'),
    validate(projectIdParamSchema, 'params'),
    controller.listPendingTimeEntries
);

// Update time entry (freelancer, draft only)
timeRouter.put(
    '/:timeEntryId',
    authenticate,
    requireRole('freelancer'),
    validate(timeEntryIdParamSchema, 'params'),
    validate(updateTimeEntrySchema),
    controller.updateTimeEntry
);

// Submit for approval (freelancer)
timeRouter.patch(
    '/:timeEntryId/submit',
    authenticate,
    requireRole('freelancer'),
    validate(timeEntryIdParamSchema, 'params'),
    controller.submitTimeEntry
);

// Approve/reject (client)
timeRouter.patch(
    '/:timeEntryId/review',
    authenticate,
    requireRole('client'),
    validate(timeEntryIdParamSchema, 'params'),
    validate(reviewTimeEntrySchema),
    controller.reviewTimeEntry
);

// Delete time entry (freelancer, draft only)
timeRouter.delete(
    '/:timeEntryId',
    authenticate,
    requireRole('freelancer'),
    validate(timeEntryIdParamSchema, 'params'),
    controller.deleteTimeEntry
);

module.exports = { invoiceRouter: router, timeEntryRouter: timeRouter };
