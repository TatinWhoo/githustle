// src/modules/jobs/jobs.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const controller = require('./jobs.controller');
const {
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
} = require('./jobs.validation');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL ROUTING ORDER RULE:
//
// Express matches routes top-to-bottom, stopping at the first match.
// Static paths (/my, /saved, /proposals/...) MUST come before dynamic paths
// (/:jobId) — otherwise Express sees "my" as a jobId UUID and the route
// hits the wrong handler.
//
// This is the same pattern used in profiles.routes.js:
//   /freelancers/me   declared before  /freelancers/:userId
// ─────────────────────────────────────────────────────────────────────────────

// ── Static routes (no dynamic segment) — DECLARE FIRST ──────────────────────

// Client sees their own posted jobs
router.get(
    '/my',
    authenticate,
    requireRole('client'),
    validate(myJobsQuerySchema, 'query'),
    controller.getClientJobs
);

// Freelancer's saved/bookmarked jobs
router.get(
    '/saved',
    authenticate,
    requireRole('freelancer'),
    controller.listSavedJobs
);

// ── Proposal routes (no /:jobId prefix) — DECLARE BEFORE /:jobId ────────────

// Freelancer sees all their submitted proposals
router.get(
    '/proposals/my',
    authenticate,
    requireRole('freelancer'),
    controller.listMyProposals
);

// Freelancer edits their pending proposal
// validate(proposalIdParamSchema, 'params') — second arg tells validate to look at req.params
router.put(
    '/proposals/:proposalId',
    authenticate,
    requireRole('freelancer'),
    validate(proposalIdParamSchema, 'params'),
    validate(updateProposalSchema),              // defaults to req.body
    controller.updateProposal
);

// Freelancer withdraws (deletes) their proposal
router.delete(
    '/proposals/:proposalId',
    authenticate,
    requireRole('freelancer'),
    validate(proposalIdParamSchema, 'params'),
    controller.withdrawProposal
);

// Client accepts or rejects a proposal
// PATCH (not PUT) — we're partially updating only the status field
router.patch(
    '/proposals/:proposalId/status',
    authenticate,
    requireRole('client'),
    validate(proposalIdParamSchema, 'params'),
    validate(updateProposalStatusSchema),
    controller.reviewProposal
);

// ── Job CRUD (dynamic /:jobId routes) — DECLARE AFTER static ────────────────

// Public job board — no auth, no role required
router.post('/',
    authenticate,
    requireRole('client'),
    validate(createJobSchema),
    controller.createJob
);

router.get('/',
    validate(browseJobsQuerySchema, 'query'),
    controller.browseJobs
);

// Public single job view
router.get('/:jobId',
    validate(jobIdParamSchema, 'params'),
    controller.getJob
);

router.put('/:jobId',
    authenticate,
    requireRole('client'),
    validate(jobIdParamSchema, 'params'),
    validate(updateJobSchema),
    controller.updateJob
);

router.delete('/:jobId',
    authenticate,
    requireRole('client'),
    validate(jobIdParamSchema, 'params'),
    controller.deleteJob
);

// ── Job skills ───────────────────────────────────────────────────────────────

router.post('/:jobId/skills',
    authenticate,
    requireRole('client'),
    validate(jobIdParamSchema, 'params'),
    validate(replaceJobSkillsSchema),
    controller.replaceJobSkills
);

// ── Saved jobs (job-scoped) ──────────────────────────────────────────────────

router.post('/:jobId/save',
    authenticate,
    requireRole('freelancer'),
    validate(jobIdParamSchema, 'params'),
    controller.saveJob
);

router.delete('/:jobId/save',
    authenticate,
    requireRole('freelancer'),
    validate(jobIdParamSchema, 'params'),
    controller.unsaveJob
);

// ── Proposals (job-scoped) ──────────────────────────────────────────────────

// Freelancer submits a proposal to a specific job
router.post('/:jobId/proposals',
    authenticate,
    requireRole('freelancer'),
    validate(jobIdParamSchema, 'params'),
    validate(submitProposalSchema),
    controller.submitProposal
);

// Client views all proposals on their own job
router.get('/:jobId/proposals',
    authenticate,
    requireRole('client'),
    validate(jobIdParamSchema, 'params'),
    controller.listProposalsForJob
);

module.exports = router;
