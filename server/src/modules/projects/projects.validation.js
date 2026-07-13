// src/modules/projects/projects.validation.js
const { z } = require('zod');

// ─────────────────────────────────────────────────────────────────────────────
// PARAM SCHEMAS
// Purpose: Validate UUIDs in URL params before any DB call is attempted.
// ─────────────────────────────────────────────────────────────────────────────

const projectIdParamSchema = z.object({
    projectId: z.string().uuid('Invalid Project ID'),
});

const milestoneIdParamSchema = z.object({
    projectId: z.string().uuid('Invalid Project ID'),
    milestoneId: z.string().uuid('Invalid Milestone ID'),
});

const deliverableIdParamSchema = z.object({
    projectId: z.string().uuid('Invalid Project ID'),
    milestoneId: z.string().uuid('Invalid Milestone ID'),
    deliverableId: z.string().uuid('Invalid Deliverable ID'),
});

const proposalIdParamSchema = z.object({
    proposalId: z.string().uuid('Invalid Proposal ID'),
});

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT CREATION FROM PROPOSAL
// Purpose: Optional overrides when activating a project.
// Most fields (title, client_id, freelancer_id, agreed_rate) come from the
// proposal + job records directly — the client only needs to confirm optional
// overrides like start/end dates.
// ─────────────────────────────────────────────────────────────────────────────

const createProjectFromProposalSchema = z.object({
    // Optional overrides - if ommited, defaults are derived from the proposal
    startDate: z.string().date().optional(), // YYYY-MM-DD
    endDate: z.string().date().optional(), // YYYY-MM-DD
    totalBudget: z.coerce.number().min(0).optional() // Fixed-price cap; null = open
}).optional().default({});

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT STATUS UPDATE
// Purpose: Allow either party to change project-level status.
// Freelancer can mark on_hold. Client can mark completed/cancelled.
// 'disputed' is set by admin only — not exposed here.
// ─────────────────────────────────────────────────────────────────────────────

const updateProjectStatusSchema = z.object({
    status: z.enum(['active', 'on_hold', 'completed', 'cancelled']),
    // reason is useful when cancelling - stored in a future audit log
    reason: z.string().trim().max(500).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT LIST QUERY
// Purpose: Filter the project list by status and paginate.
// ─────────────────────────────────────────────────────────────────────────────

const listProjectsQuerySchema = z.object({
    status: z.enum(['active', 'on_hold', 'completed', 'cancelled', 'disputed']).optional(),
    cursor: z.string().optional(), // ISO timestamp of last seen project.created_at
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE CRUD
// Purpose: Validate milestone creation and update.
//
// amount: how much this milestone pays the freelancer.
//   The DB trigger `trg_enforce_budget` will reject if the sum of all
//   milestone amounts exceeds projects.total_budget — we don't need to
//   check this in JS, but we do enforce amount > 0.
//
// orderIndex: used to sort milestones on the UI (drag-to-reorder).
// ─────────────────────────────────────────────────────────────────────────────

const createMilestoneSchema = z.object({
    title: z.string().trim().min(3).max(255),
    description: z.string().trim().max(5000).optional(),
    amount: z.coerce.number().min(0.01), // must be > 0
    dueDate: z.string().date().optional(), // YYYY-MM-DD
    orderIndex: z.coerce.number().int().min(0).optional(),
});

// All fields optional for partial update - but only while milestone is 'pending'
const updateMilestoneSchema = createMilestoneSchema.partial();

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE STATUS TRANSITION
// Purpose: The client/freelancer POSTs the *desired* next status.
//          The service validates whether the transition is legal given
//          current status AND the caller's role.
//
// rejectionReason: required when status = 'rejected' so the freelancer
//   knows what to fix before resubmitting.
// ─────────────────────────────────────────────────────────────────────────────

const updateMilestoneStatusSchema = z.object({
    status: z.enum(['in_progress', 'submitted', 'in_review', 'approved', 'rejected', 'paid']),
    rejectionReason: z.string().trim().min(10).max(2000).optional(),
}).refine(
    (d) => d.status !== 'rejected' || !!d.rejectionReason,
    { message: 'rejectionReason is required when rejected a milestone', path: ['rejectionReason'] }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE UPLOAD
// Purpose: Optional note attached alongside the uploaded file.
// The file itself is handled by Multer middleware — this schema only covers
// the text field that can accompany a file upload.
// ─────────────────────────────────────────────────────────────────────────────

const uploadDeliverableSchema = z.object({
    note: z.string().trim().max(1000).optional(),
});

module.exports = {
    projectIdParamSchema,
    milestoneIdParamSchema,
    deliverableIdParamSchema,
    proposalIdParamSchema,
    createProjectFromProposalSchema,
    updateProjectStatusSchema,
    listProjectsQuerySchema,
    createMilestoneSchema,
    updateMilestoneSchema,
    updateMilestoneStatusSchema,
    uploadDeliverableSchema,
};