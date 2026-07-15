// src/modules/invoices/invoices.validation.js
const { z } = require('zod');

// ─────────────────────────────────────────────────────────────────────────────
// PARAM SCHEMAS
// Purpose: Validate UUIDs in URL params before any DB call is attempted.
// ─────────────────────────────────────────────────────────────────────────────

const invoiceIdParamSchema = z.object({
    invoiceId: z.string().uuid('Invalid Invoice ID'),
});

const paymentIdParamSchema = z.object({
    paymentId: z.string().uuid('Invalid Payment ID'),
});

const timeEntryIdParamSchema = z.object({
    timeEntryId: z.string().uuid('Invalid Time Entry ID'),
});

const projectIdParamSchema = z.object({
    projectId: z.string().uuid('Invalid Project ID'),
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE CREATION
// Purpose: Freelancer creates an invoice for a project (optionally linked to a milestone).
//
// Why no invoice_number field?
//   The DB trigger `trg_invoice_number` auto-generates it on INSERT.
//   Including it here would cause a UNIQUE conflict or be silently overwritten.
//
// items: Array of line items. Each item's `amount` is computed server-side
//   as `quantity * unit_price` to prevent client-side math errors.
//   subtotal = sum of all item amounts.
//   tax_amount = subtotal * (tax_rate / 100).
//   total_amount = subtotal + tax_amount.
//   These are validated in the service, not Zod, because they depend on items.
// ─────────────────────────────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
    description: z.string().trim().min(1).max(500),
    quantity:    z.coerce.number().min(0.01).max(99999),
    unitPrice:   z.coerce.number().min(0).max(9999999999),
    orderIndex:  z.coerce.number().int().min(0).optional(),
});

const createInvoiceSchema = z.object({
    projectId:   z.string().uuid(),
    milestoneId: z.string().uuid().optional(),  // optional: invoice may cover the whole project
    taxRate:     z.coerce.number().min(0).max(100).default(0),
    dueDate:     z.string().date(),             // YYYY-MM-DD
    notes:       z.string().trim().max(2000).optional(),
    terms:       z.string().trim().max(2000).optional(),
    items:       z.array(invoiceItemSchema).min(1).max(50),
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE UPDATE
// Purpose: Edit a draft invoice before sending.
// Only draft invoices can be updated — once sent, they're locked.
// items can be fully replaced (delete all + re-insert) on each update.
// ─────────────────────────────────────────────────────────────────────────────

const updateInvoiceSchema = z.object({
    taxRate:  z.coerce.number().min(0).max(100).optional(),
    dueDate:  z.string().date().optional(),
    notes:    z.string().trim().max(2000).optional(),
    terms:    z.string().trim().max(2000).optional(),
    items:    z.array(invoiceItemSchema).min(1).max(50).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE STATUS UPDATE
// Purpose: Transition invoice status.
//   Freelancer: draft → sent, draft → cancelled
//   Client: sent → paid (triggers payment creation), sent → disputed
//   System: sent → overdue (BullMQ worker)
// ─────────────────────────────────────────────────────────────────────────────

const updateInvoiceStatusSchema = z.object({
    status:        z.enum(['sent', 'paid', 'cancelled', 'disputed']),
    paymentMethod: z.string().trim().max(50).optional(),  // required when marking as paid
}).refine(
    (d) => d.status !== 'paid' || !!d.paymentMethod,
    { message: 'paymentMethod is required when marking an invoice as paid', path: ['paymentMethod'] }
);

// ─────────────────────────────────────────────────────────────────────────────
// TIME ENTRY SCHEMAS
// Purpose: Hourly billing tracking for hourly-rate projects.
//
// hours: computed server-side from start_time/end_time for completed entries.
//   For manual entries (timer stopped), the freelancer may provide hours directly.
// ─────────────────────────────────────────────────────────────────────────────

const createTimeEntrySchema = z.object({
    projectId:   z.string().uuid(),
    milestoneId: z.string().uuid().optional(),
    description: z.string().trim().min(3).max(1000),
    startTime:   z.string().datetime({ offset: true }),
    endTime:     z.string().datetime({ offset: true }).optional(),
    hours:       z.coerce.number().min(0.01).max(24).optional(),
    isBillable:  z.boolean().default(true),
});

const updateTimeEntrySchema = z.object({
    description: z.string().trim().min(3).max(1000).optional(),
    startTime:   z.string().datetime({ offset: true }).optional(),
    endTime:     z.string().datetime({ offset: true }).optional(),
    hours:       z.coerce.number().min(0.01).max(24).optional(),
    isBillable:  z.boolean().optional(),
});

// Purpose: Client approves or rejects a time entry.
const reviewTimeEntrySchema = z.object({
    status:        z.enum(['approved', 'rejected']),
    rejectionNote: z.string().trim().min(5).max(1000).optional(),
}).refine(
    (d) => d.status !== 'rejected' || !!d.rejectionNote,
    { message: 'rejectionNote is required when rejecting a time entry', path: ['rejectionNote'] }
);

// ─────────────────────────────────────────────────────────────────────────────
// QUERY SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const listInvoicesQuerySchema = z.object({
    status:    z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'disputed']).optional(),
    projectId: z.string().uuid().optional(),
    cursor:    z.string().optional(),
    limit:     z.coerce.number().int().min(1).max(50).default(20),
});

const listTimeEntriesQuerySchema = z.object({
    status:    z.enum(['draft', 'submitted', 'approved', 'rejected', 'billed']).optional(),
    projectId: z.string().uuid().optional(),
    startDate: z.string().date().optional(),  // filter by date range
    endDate:   z.string().date().optional(),
    cursor:    z.string().optional(),
    limit:     z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
    invoiceIdParamSchema,
    paymentIdParamSchema,
    timeEntryIdParamSchema,
    projectIdParamSchema,
    createInvoiceSchema,
    updateInvoiceSchema,
    updateInvoiceStatusSchema,
    invoiceItemSchema,
    createTimeEntrySchema,
    updateTimeEntrySchema,
    reviewTimeEntrySchema,
    listInvoicesQuerySchema,
    listTimeEntriesQuerySchema,
};