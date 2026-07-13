// src/modules/projects/projects.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const { uploadSingleImage } = require('../../middleware/upload');
const controller = require('./projects.controller');
const {
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
} = require('./projects.validation');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: All routes require authentication — there are no public project routes.
//       The authenticate middleware is applied to every route below.
// ─────────────────────────────────────────────────────────────────────────────

// ── Project-level routes ─────────────────────────────────────────────────────

// Create a project from an accepted proposal (client only)
// POST /api/v1/projects/from-proposal/:proposalId
// Static segment 'from-proposal' must appear BEFORE /:projectId
router.post(
    '/from-proposal/:proposalId',
    authenticate,
    requireRole('client'),
    validate(proposalIdParamSchema, 'params'),
    validate(createProjectFromProposalSchema),
    controller.createProjectFromProposal
);

// List own projects (works for both client and freelancer — service is role-aware)
router.get(
    '/',
    authenticate,
    validate(listProjectsQuerySchema, 'query'),
    controller.listProjects
);

// Get project detail — both members
router.get(
    '/:projectId',
    authenticate,
    validate(projectIdParamSchema, 'params'),
    controller.getProject
);

// Update project status (e.g., mark completed, put on hold)
router.patch(
    '/:projectId/status',
    authenticate,
    validate(projectIdParamSchema, 'params'),
    validate(updateProjectStatusSchema),
    controller.updateProjectStatus
);

// Budget status view
router.get(
    '/:projectId/budget',
    authenticate,
    validate(projectIdParamSchema, 'params'),
    controller.getProjectBudget
);

// ── Milestone routes ─────────────────────────────────────────────────────────

// Create a milestone (client only)
router.post(
    '/:projectId/milestones',
    authenticate,
    requireRole('client'),
    validate(projectIdParamSchema, 'params'),
    validate(createMilestoneSchema),
    controller.createMilestone
);

// List milestones on a project (both members)
router.get(
    '/:projectId/milestones',
    authenticate,
    validate(projectIdParamSchema, 'params'),
    controller.listMilestones
);

// Get single milestone (both members)
router.get(
    '/:projectId/milestones/:milestoneId',
    authenticate,
    validate(milestoneIdParamSchema, 'params'),
    controller.getMilestone
);

// Edit milestone metadata (client only, pending state only)
router.put(
    '/:projectId/milestones/:milestoneId',
    authenticate,
    requireRole('client'),
    validate(milestoneIdParamSchema, 'params'),
    validate(updateMilestoneSchema),
    controller.updateMilestone
);

// Delete milestone (client only, pending state only)
router.delete(
    '/:projectId/milestones/:milestoneId',
    authenticate,
    requireRole('client'),
    validate(milestoneIdParamSchema, 'params'),
    controller.deleteMilestone
);

// Advance milestone status — both roles can use this; service enforces role-per-transition
router.patch(
    '/:projectId/milestones/:milestoneId/status',
    authenticate,
    validate(milestoneIdParamSchema, 'params'),
    validate(updateMilestoneStatusSchema),
    controller.updateMilestoneStatus
);

// ── Deliverable routes ───────────────────────────────────────────────────────

// Upload a file deliverable (freelancer only)
// uploadSingleImage('file', 50) — field name 'file', max 50 MB
// Note: we reuse uploadSingleImage but deliverables aren't restricted to images.
// For a production app you'd create a separate uploadSingleFile middleware
// that accepts PDF, ZIP, etc. For now, images only.
router.post(
    '/:projectId/milestones/:milestoneId/deliverables',
    authenticate,
    requireRole('freelancer'),
    validate(milestoneIdParamSchema, 'params'),
    uploadSingleImage('file', 50),   // Multer parses the multipart file into req.file
    validate(uploadDeliverableSchema),
    controller.uploadDeliverable
);

// List deliverables (both members)
router.get(
    '/:projectId/milestones/:milestoneId/deliverables',
    authenticate,
    validate(milestoneIdParamSchema, 'params'),
    controller.listDeliverables
);

// Delete a deliverable (freelancer who uploaded it)
router.delete(
    '/:projectId/milestones/:milestoneId/deliverables/:deliverableId',
    authenticate,
    requireRole('freelancer'),
    validate(deliverableIdParamSchema, 'params'),
    controller.deleteDeliverable
);

module.exports = router;
