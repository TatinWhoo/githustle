// src/modules/projects/projects.service.js
const AppError = require('../../utils/AppError');
const { saveBuffer, deleteFile } = require('../../utils/fileStorage');
const repo = require('./projects.repository');

// We need proposal + job data to build the project — import jobs repo
const jobsRepo = require('../jobs/jobs.repository');

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// Purpose: Convert snake_case DB rows to camelCase API responses.
//          Also coerces NUMERIC strings to JS Numbers.
// ─────────────────────────────────────────────────────────────────────────────

function toProjectDTO(p) {
    return {
        id: p.id,
        jobId: p.job_id,
        proposalId: p.proposal_id,
        clientId: p.client_id,
        freelancerId: p.freelancer_id,
        title: p.title,
        description: p.description,
        budgetType: p.budget_type,
        agreedRate: Number(p.agreed_rate),
        totalBudget: p.total_budget !== null ? Number(p.total_budget) : null,
        startDate: p.start_date,
        endDate: p.end_date,
        status: p.status,
        createdAt: p.created_at,
    };
}

function toMilestoneDTO(m) {
    return {
        id: m.id,
        projectId: m.project_id,
        title: m.title,
        description: m.description,
        amount: Number(m.amount),
        dueDate: m.due_date,
        orderIndex: m.order_index,
        status: m.status,
        startedAt: m.started_at,
        submittedAt: m.submitted_at,
        approvedAt: m.approved_at,
        paidAt: m.paid_at,
        rejectionReason: m.rejection_reason,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
    };
}

function toDeliverableDTO(d) {
    return {
        id: d.id,
        milestoneId: d.milestone_id,
        uploaderId: d.uploader_id,
        fileName: d.file_name,
        originalName: d.original_name,
        fileUrl: d.file_url,
        fileSizeBytes: d.file_size_bytes !== null ? Number(d.file_size_bytes) : null,
        mimeType: d.mime_type,
        note: d.note,
        createdAt: d.created_at,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURSOR PAGINATION HELPER (same pattern as jobs.service.js)
// ─────────────────────────────────────────────────────────────────────────────

function buildCursorResponse(rows, limit, keyField = 'createdAt') {
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1][keyField] : null;
    return { data, hasMore, nextCursor };
}

// ─────────────────────────────────────────────────────────────────────────────
// OWNERSHIP HELPERS
// Purpose: Centralize the "does this user belong to this project?" check
//          so every service function doesn't repeat the same boilerplate.
// ─────────────────────────────────────────────────────────────────────────────

function assertProjectMember(project, userId) {
    // Both client and freelancer are members of a project
    if (project.client_id !== userId && project.freelancer_id !== userId) {
        throw new AppError('Forbidden.', 403);
    }
}

function assertProjectClient(project, userId) {
    if (project.client_id !== userId) throw new AppError('Forbidden.', 403);
}

function assertProjectFreelancer(project, userId) {
    if (project.freelancer_id !== userId) throw new AppError('Forbidden.', 403);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: The M3→M4 activation step.
// When a client accepts a proposal, the next action is to "start" the project.
// This function:
//   1. Loads the proposal to get the agreed rate + freelancer id.
//   2. Loads the originating job for title + budget_type.
//   3. Checks the proposal is actually 'accepted' (can't start a pending proposal).
//   4. Checks no project already exists for this proposal (UNIQUE enforced in DB too).
//   5. Creates the projects row.
async function createProjectFromProposal(clientId, proposalId, overrides) {
    // Load the proposal (from jobs module's repo — cross-module data access)
    const proposal = await jobsRepo.findProposalById(proposalId);
    if (!proposal) throw new AppError('Proposal not found.', 404);
    if (proposal.status !== 'accepted') {
        throw new AppError('Project can only be created from an accepted proposal.', 422);
    }

    // Load the job that the proposal was for
    const job = await jobsRepo.findJobById(proposal.job_id);
    // job might be null if the posting was deleted — that's okay, we still proceed
    // with a fallback title

    // Guard: prevent duplicate projects from the same proposal
    const existing = await repo.findProjectByProposalId(proposalId);
    if (existing) throw new AppError('A project already exists for this proposal.', 409);

    // Verify the caller is the client who owns this job.
    // When job is null (soft-deleted), findJobById returns null but the row still
    // exists in job_postings — use findJobClientId which bypasses deleted_at.
    const jobClientId = job ? job.client_id : await repo.findJobClientId(proposal.job_id);
    if (jobClientId !== clientId) throw new AppError('Forbidden.', 403);

    const project = await repo.createProject({
        jobId: proposal.job_id,
        proposalId,
        clientId,
        freelancerId: proposal.freelancer_id,
        title: job ? job.title : 'Project',
        budgetType: job ? job.budget_type : 'fixed',
        agreedRate: proposal.proposed_rate,
        totalBudget: overrides.totalBudget ?? null,
        startDate: overrides.startDate ?? null,
        endDate: overrides.endDate ?? null,
    });

    return toProjectDTO(project);
}

// Purpose: Get a project. Both members can access.
async function getProject(userId, projectId) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectMember(project, userId);

    // Use the view for the detail response — it includes milestone summary + message count
    const detail = await repo.findProjectDetail(projectId);
    return detail; // view already returns the right shape — no DTO needed
}

// Purpose: Get project budget status.
async function getProjectBudget(userId, projectId) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectMember(project, userId);
    return repo.findProjectBudgetStatus(projectId);
}

// Purpose: List projects for the current user (role-aware).
async function listProjects(userId, role, filters) {
    const rows = await repo.findProjectsByUser(userId, role, filters);
    const mapped = rows.map((p) => ({
        ...toProjectDTO(p),
        partnerName: p.partner_name,
        partnerAvatar: p.partner_avatar,
        totalMilestones: Number(p.total_milestones),
        paidMilestones: Number(p.paid_milestones),
    }));
    return buildCursorResponse(mapped, filters.limit);
}

// Purpose: Update project status with role-specific guards.
// Rules:
//   - Both can set 'on_hold' / 'active'
//   - Only client can set 'completed' or 'cancelled'
//   - 'disputed' is admin-only (not in this schema)
async function updateProjectStatus(userId, projectId, status) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectMember(project, userId);

    // Client-only transitions
    if (['completed', 'cancelled'].includes(status) && project.client_id !== userId) {
        throw new AppError('Only the client can mark a project completed or cancelled.', 403);
    }

    // Determine which completion timestamp to set
    let completedByRole = null;
    if (status === 'completed') completedByRole = project.client_id === userId ? 'client' : 'freelancer';

    const updated = await repo.updateProjectStatus(projectId, status, completedByRole);
    return toProjectDTO(updated);
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Create a milestone. Client-only.
// The DB trigger catches budget overflows — we translate the Postgres error
// into a clean 422 with a helpful message.
async function createMilestone(clientId, projectId, data) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectClient(project, clientId);

    if (project.status !== 'active') {
        throw new AppError('Milestones can only be added to active projects.', 422);
    }

    try {
        const milestone = await repo.createMilestone(projectId, data);
        return toMilestoneDTO(milestone);
    } catch (err) {
        // Postgres error code 23514 = check violation (our budget trigger raises this)
        if (err.code === '23514') {
            throw new AppError(err.message, 422);
        }
        throw err;
    }
}

// Purpose: Get all milestones on a project (both members can view).
async function listMilestones(userId, projectId) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectMember(project, userId);

    const rows = await repo.listMilestones(projectId);
    return rows.map(toMilestoneDTO);
}

// Purpose: Get single milestone detail.
async function getMilestone(userId, projectId, milestoneId) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectMember(project, userId);

    const milestone = await repo.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
        throw new AppError('Milestone not found.', 404);
    }
    return toMilestoneDTO(milestone);
}

// Purpose: Edit a milestone. Client-only, and only while the milestone is 'pending'.
// Rationale: Once work has started (in_progress+), scope changes require
// re-negotiation, not silent edits.
async function updateMilestone(clientId, projectId, milestoneId, data) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectClient(project, clientId);

    const milestone = await repo.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
        throw new AppError('Milestone not found.', 404);
    }
    if (milestone.status !== 'pending') {
        throw new AppError('Only pending milestones can be edited.', 422);
    }

    try {
        const updated = await repo.updateMilestone(milestoneId, data);
        return toMilestoneDTO(updated);
    } catch (err) {
        if (err.code === '23514') throw new AppError(err.message, 422);
        throw err;
    }
}

// Purpose: Delete a milestone. Client-only, only while 'pending'.
async function deleteMilestone(clientId, projectId, milestoneId) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectClient(project, clientId);

    const milestone = await repo.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
        throw new AppError('Milestone not found.', 404);
    }
    if (milestone.status !== 'pending') {
        throw new AppError('Only pending milestones can be deleted.', 422);
    }

    await repo.deleteMilestone(milestoneId);
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE STATUS TRANSITION SERVICE
//
// Purpose: Enforce the state machine — check current status, validate role,
//          then apply the transition.
//
// Why one function for all transitions?
//   All status changes go through one route (PATCH .../status). The service
//   inspects both the *requested* next status AND the *current* status to
//   determine if the transition is valid. This is cleaner than one endpoint
//   per transition.
// ─────────────────────────────────────────────────────────────────────────────

// Legal transitions map: { currentStatus: { nextStatus: requiredRole } }
const TRANSITIONS = {
    pending: { in_progress: 'freelancer' },
    in_progress: { submitted: 'freelancer' },
    submitted: { in_review: 'client' },
    in_review: { approved: 'client', rejected: 'client' },
    rejected: { in_progress: 'freelancer' },
    approved: { paid: 'client' },
};

async function updateMilestoneStatus(userId, userRole, projectId, milestoneId, requestedStatus, extra) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectMember(project, userId);

    const milestone = await repo.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
        throw new AppError('Milestone not found.', 404);
    }

    const currentStatus = milestone.status;

    // Check if the transition exists in our state machine
    const allowedNext = TRANSITIONS[currentStatus];
    if (!allowedNext || !(requestedStatus in allowedNext)) {
        throw new AppError(
            `Cannot transition milestone from '${currentStatus}' to '${requestedStatus}'.`,
            422
        );
    }

    // Check if the caller's role is allowed to make this transition
    const requiredRole = allowedNext[requestedStatus];
    if (userRole !== requiredRole) {
        throw new AppError(
            `Only the ${requiredRole} can move a milestone to '${requestedStatus}'.`,
            403
        );
    }

    const updated = await repo.updateMilestoneStatus(milestoneId, requestedStatus, extra);
    return toMilestoneDTO(updated);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Upload a file deliverable for a milestone.
// Only the freelancer on the project can submit deliverables.
// Milestone must be in_progress, submitted, or in_review (work is active).
// File goes through the same saveBuffer() pipeline used in M2 for avatars.
async function uploadDeliverable(freelancerId, projectId, milestoneId, file, note) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectFreelancer(project, freelancerId);

    const milestone = await repo.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
        throw new AppError('Milestone not found.', 404);
    }

    // Only allow uploads while work is active
    const uploadableStatuses = ['in_progress', 'submitted', 'in_review'];
    if (!uploadableStatuses.includes(milestone.status)) {
        throw new AppError(
            `Deliverables can only be uploaded when milestone is in_progress, submitted, or in_review.`,
            422
        );
    }

    if (!file) throw new AppError('No file attached. Include a file under the "file" field.', 400);

    // Save to disk (same utility as M2 avatars/portfolio)
    const saved = await saveBuffer(file.buffer, 'deliverables', file.mimetype);

    const deliverable = await repo.createDeliverable(milestoneId, freelancerId, {
        fileName: saved.filename,
        originalName: file.originalname,
        fileUrl: saved.url,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        note,
    });

    return toDeliverableDTO(deliverable);
}

// Purpose: List deliverables on a milestone. Both project members can view.
async function listDeliverables(userId, projectId, milestoneId) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectMember(project, userId);

    const milestone = await repo.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
        throw new AppError('Milestone not found.', 404);
    }

    const rows = await repo.listDeliverables(milestoneId);
    return rows.map(toDeliverableDTO);
}

// Purpose: Delete a deliverable. Freelancer-only, must own the upload.
// Deletes both the DB row and the physical file.
async function deleteDeliverable(freelancerId, projectId, milestoneId, deliverableId) {
    const project = await repo.findProjectById(projectId);
    if (!project) throw new AppError('Project not found.', 404);
    assertProjectFreelancer(project, freelancerId);

    const deliverable = await repo.findDeliverableById(deliverableId);
    if (!deliverable || deliverable.milestone_id !== milestoneId) {
        throw new AppError('Deliverable not found.', 404);
    }
    if (deliverable.uploader_id !== freelancerId) {
        throw new AppError('You can only delete your own deliverables.', 403);
    }

    await repo.deleteDeliverable(deliverableId);

    // Delete the physical file — extract relative path from the public URL
    // file_url format: https://host/uploads/deliverables/filename.ext
    const relativePath = deliverable.file_url.split('/uploads/')[1];
    if (relativePath) await deleteFile(relativePath).catch(() => { });
}

module.exports = {
    createProjectFromProposal,
    getProject, getProjectBudget, listProjects, updateProjectStatus,
    createMilestone, listMilestones, getMilestone, updateMilestone, deleteMilestone,
    updateMilestoneStatus,
    uploadDeliverable, listDeliverables, deleteDeliverable,
};
