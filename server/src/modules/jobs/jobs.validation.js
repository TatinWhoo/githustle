// src/modules/jobs.validation.js
const { z } = require('zod');

// ─────────────────────────────────────────────────────────────────────────────
// URL PARAM SCHEMAS
// Purpose: Validate that `:jobId` and `:proposalId` in the URL are real UUIDs
//          before we even attempt a DB query. Prevents SQL errors and leaks.
// ─────────────────────────────────────────────────────────────────────────────

const jobIdParamSchema = z.object({
    jobId: z.string().uuid('Invalid Job ID'),
});

const proposalIdParamSchema = z.object({
    proposalId: z.string().uuid('Invalid Proposal ID')
});

// ─────────────────────────────────────────────────────────────────────────────
// JOB CREATION SCHEMA
// Purpose: Validate the body when a client posts a new job.
//
// Key design decisions:
//   - budgetType drives which budget fields are required (fixed vs hourly).
//   - We use .refine() at the schema level so the error is caught in validation,
//     not buried inside service logic. Fail fast, fail clearly.
//   - z.coerce.number() handles string-to-number conversion from JSON payloads
//     that might come in as strings (e.g., from form data).
// ─────────────────────────────────────────────────────────────────────────────

// Base shape without refinement — used for .partial() in updateJobSchema
const createJobBaseSchema = z.object({
    title:           z.string().trim().min(5).max(255),
    description:     z.string().trim().min(20).max(10000),
    budgetType:      z.enum(['fixed', 'hourly']),

    // fixed budget fields - only required when budgetType = 'fixed'
    budgetMin:       z.coerce.number().min(0).optional(),
    budgetMax:       z.coerce.number().min(0).optional(),

    // hourly budget fields - only required when budgetType = 'hourly'
    hourlyRateMin:   z.coerce.number().min(0).optional(),
    hourlyRateMax:   z.coerce.number().min(0).optional(),

    experienceLevel: z.enum(['entry', 'intermediate', 'expert']).optional(),
    estimatedWeeks:  z.coerce.number().int().min(1).max(260).optional(),

    // ISO 8601 with timezone offset - stored as TIMESTAMPZ in Postgres
    deadlineAt:      z.string().datetime({ offset: true }).optional(),
});

const createJobSchema = createJobBaseSchema.refine((d) => {
    // Cross-field validation: budget fields must match the declared budgetType.
    // This mirrors the DB CHECK constraint in job_postings but catches it earlier.
    if (d.budgetType === 'fixed') return d.budgetMin !== undefined && d.budgetMax !== undefined;
    if (d.budgetType === 'hourly') return d.hourlyRateMin !== undefined && d.hourlyRateMax !== undefined;
    return true;
}, {
    message: "Budget fields must match budgetType (fixed needs budgetMin + budgetMax, hourly needs hourlyRateMin + hourlyRateMax)"
});

// ─────────────────────────────────────────────────────────────────────────────
// JOB UPDATE SCHEMA
// Purpose: Partial update — all fields optional.
//
// Why we omit budgetType:
//   budgetType is structural — changing fixed→hourly would orphan existing
//   budget columns and break the DB CHECK constraint. Treat it as immutable
//   after creation. If needed, the client must delete and recreate.
//
// Note: .partial() is called on the base shape (no .refine()) because
//   Zod v4 disallows .partial() on a schema that already has refinements.
// ─────────────────────────────────────────────────────────────────────────────

const updateJobSchema = createJobBaseSchema.partial().omit({ budgetType: true });

// ─────────────────────────────────────────────────────────────────────────────
// JOB SKILLS SCHEMA
// Purpose: Replace all skills on a job in one call (same pattern as
//          profiles.validation.js replaceSkillsSchema).
//          Max 20 skills per job — enough for any realistic job post.
// ─────────────────────────────────────────────────────────────────────────────

const replaceJobSkillsSchema = z.object({
    skills: z.array(
        z.object({
            skillId: z.string().uuid(),
            isRequired: z.boolean().default(true), // true = must-have, false = nice-to-have
        })
    ).max(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// BROWSE JOBS QUERY SCHEMA
// Purpose: Validate and coerce all query params for the public job board.
//
// cursor: ISO timestamp of the last item seen on the previous page.
//         Used for cursor-based pagination instead of page/offset.
//         Why? Offset pagination drifts when new jobs are added between pages.
//         Cursor pagination is stable — always picks up exactly where you left off.
//
// limit default 20, max 50: prevents clients from dumping the entire table.
// ─────────────────────────────────────────────────────────────────────────────

const browseJobsQuerySchema = z.object({
    q: z.string().trim().max(200).optional(),   // full-text search term
    budgetType: z.enum(['fixed', 'hourly']).optional(),
    budgetMin: z.coerce.number().min(0).optional(),
    budgetMax: z.coerce.number().min(0).optional(),
    experienceLevel: z.enum(['entry', 'intermediate', 'expert']).optional(),
    skillId: z.string().uuid().optional(),             // filter by one skill
    cursor: z.string().optional(),                    // ISO timestamp of last seen item
    limit: z.coerce.number().int().min(1).max(50).default(20),
});
// ─────────────────────────────────────────────────────────────────────────────
// MY JOBS QUERY SCHEMA (client-facing)
// Purpose: Client can filter their own postings by status and paginate.
// ─────────────────────────────────────────────────────────────────────────────
const myJobsQuerySchema = z.object({
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled', 'closed']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});
// ─────────────────────────────────────────────────────────────────────────────
// PROPOSAL SCHEMAS
// Purpose: Validate proposal submission and editing.
//
// coverLetter min 50 chars: enforces that freelancers write something meaningful,
//   not just "hi please hire me".
// aiGenerated flag: stored so clients can see whether the proposal was AI-assisted
//   (transparency feature, ties into Module 07 AI Work Assistant).
// ─────────────────────────────────────────────────────────────────────────────
const submitProposalSchema = z.object({
    coverLetter: z.string().trim().min(50).max(5000),
    proposedRate: z.coerce.number().min(1).max(1_000_000),
    proposedWeeks: z.coerce.number().int().min(1).max(260).optional(),
    aiGenerated: z.boolean().default(false),
});
// Partial update — freelancer can edit any subset of fields while still pending
const updateProposalSchema = submitProposalSchema.partial();
// ─────────────────────────────────────────────────────────────────────────────
// PROPOSAL STATUS UPDATE SCHEMA (client-facing)
// Purpose: Client can only move a proposal to 'accepted' or 'rejected'.
//          'withdrawn' is a freelancer-only action handled by DELETE endpoint.
//          Keeping these separate prevents a client from marking something 'withdrawn'.
// ─────────────────────────────────────────────────────────────────────────────
const updateProposalStatusSchema = z.object({
    status: z.enum(['accepted', 'rejected']),
    clientNote: z.string().trim().max(1000).optional(), // optional feedback for freelancer
});
module.exports = {
    jobIdParamSchema,
    proposalIdParamSchema,
    createJobSchema,
    updateJobSchema,
    replaceJobSkillsSchema,
    browseJobsQuerySchema,
    myJobsQuerySchema,
    submitProposalSchema,
    updateProposalSchema,
    updateProposalStatusSchema,
};