// src/modules/jobs/jobs.service.js
const AppError = require('../../utils/AppError');
const repo = require('./jobs.repository');

// ─────────────────────────────────────────────────────────────────────────────
// DTO HELPERS (Data Transfer Objects)
//
// Purpose: Convert raw database rows (snake_case, raw Postgres types) into
// clean JavaScript objects (camelCase, proper number types).
//
// Why DTOs?
//   1. We never accidentally expose internal DB columns (e.g., deleted_at).
//   2. Numeric columns from Postgres come back as strings — Number() fixes that.
//   3. The API contract is explicit and stable even if the DB schema changes.
// ─────────────────────────────────────────────────────────────────────────────

function toJobDTO(job, skills = []) {
    return {
        id: job.id,
        clientId: job.client_id,
        title: job.title,
        description: job.description,
        budgetType: job.budget_type,
        budgetMin: job.budget_min !== null ? Number(job.budget_min) : null,
        budgetMax: job.budget_max !== null ? Number(job.budget_max) : null,
        hourlyRateMin: job.hourly_rate_min !== null ? Number(job.hourly_rate_min) : null,
        hourlyRateMax: job.hourly_rate_max !== null ? Number(job.hourly_rate_max) : null,
        experienceLevel: job.experience_level,
        estimatedWeeks: job.estimated_weeks,
        status: job.status,
        proposalsCount: job.proposals_count,
        viewsCount: job.views_count,
        deadlineAt: job.deadline_at,
        createdAt: job.created_at,
        skills,          // already shaped by listJobSkills — pass through
    };
}

function toProposalDTO(p) {
    return {
        id: p.id,
        jobId: p.job_id,
        freelancerId: p.freelancer_id,
        coverLetter: p.cover_letter,
        proposedRate: Number(p.proposed_rate), // NUMERIC from Postgres comes as string
        proposedWeeks: p.proposed_weeks,
        status: p.status,
        aiGenerated: p.ai_generated,
        clientViewedAt: p.client_viewed_at,
        clientNote: p.client_note,
        createdAt: p.created_at,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURSOR PAGINATION HELPER
//
// Purpose: Given raw rows (limit+1 fetched), determine if there's a next page
// and what the next cursor value should be.
//
// How it works:
//   1. We fetched limit+1 rows. If we got more than limit, there IS a next page.
//   2. Slice to limit rows for the response payload.
//   3. nextCursor = the createdAt of the last item in the sliced page.
//      Caller uses this as the `cursor` param on their next request.
//   4. If rows.length <= limit, we're on the last page → nextCursor = null.
//
// keyField: the field on a DTO whose value becomes the cursor.
// ─────────────────────────────────────────────────────────────────────────────

function buildCursorResponse(rows, limit, keyField = 'createdAt') {
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1][keyField] : null;
    return { data, hasMore, nextCursor };
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Create a job. No ownership check needed (client is creating it fresh).
async function createJob(clientId, data) {
    const job = await repo.createJob(clientId, data);
    return toJobDTO(job);
}

// Purpose: Fetch one job for the detail page.
// View increment is fire-and-forget (.catch(() => {}) swallows any transient
// DB error) so a failed counter update never breaks the user's page load.
async function getJob(jobId) {
    const job = await repo.findJobById(jobId);
    if (!job) throw new AppError('Job not found.', 404);

    // Don't await — fire and forget so response stays fast
    repo.incrementJobViews(jobId).catch(() => { });

    const skills = await repo.listJobSkills(jobId);
    return toJobDTO(job, skills);
}

// Purpose: Update a job. Ownership enforced here, not in the repository.
// Why service-level ownership? The repo is role-agnostic. The service knows
// about users and can throw a 403 before any UPDATE touches the DB.
async function updateJob(clientId, jobId, data) {
    const job = await repo.findJobById(jobId);
    if (!job) throw new AppError('Job not found.', 404);
    if (job.client_id !== clientId) throw new AppError('Forbidden.', 403);
    if (job.status === 'cancelled') throw new AppError('Cannot update a cancelled job.', 422);

    const updated = await repo.updateJob(jobId, data);
    const skills = await repo.listJobSkills(jobId);
    return toJobDTO(updated, skills);
}

// Purpose: Soft-delete a job. Ownership check required.
async function deleteJob(clientId, jobId) {
    const job = await repo.findJobById(jobId);
    if (!job) throw new AppError('Job not found.', 404);
    if (job.client_id !== clientId) throw new AppError('Forbidden.', 403);
    await repo.softDeleteJob(jobId);
    // No return value — controller sends 204 No Content
}

// Purpose: Public job board browse. Maps raw rows to DTOs then wraps in cursor response.
async function browseJobs(filters) {
    const rows = await repo.browseJobs(filters);
    const mapped = rows.map((j) => toJobDTO(j));
    return buildCursorResponse(mapped, filters.limit);
}

// Purpose: Client's personal job management dashboard.
async function getClientJobs(clientId, filters) {
    const rows = await repo.findJobsByClient(clientId, filters);
    const mapped = rows.map((j) => toJobDTO(j));
    return buildCursorResponse(mapped, filters.limit);
}

// Purpose: Replace all required skills on a job.
// Ownership check ensures only the job's creator can edit its skills.
async function replaceJobSkills(clientId, jobId, skills) {
    const job = await repo.findJobById(jobId);
    if (!job) throw new AppError('Job not found.', 404);
    if (job.client_id !== clientId) throw new AppError('Forbidden.', 403);
    await repo.replaceJobSkills(jobId, skills);
    return repo.listJobSkills(jobId); // return updated skill list
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVED JOBS SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Bookmark a job. Validates job exists first (can't save a ghost).
async function saveJob(freelancerId, jobId) {
    const job = await repo.findJobById(jobId);
    if (!job) throw new AppError('Job not found.', 404);
    await repo.saveJob(freelancerId, jobId); // idempotent due to ON CONFLICT DO NOTHING
}

async function unsaveJob(freelancerId, jobId) {
    await repo.unsaveJob(freelancerId, jobId); // idempotent — no error if not saved
}

async function listSavedJobs(freelancerId, cursor, limit) {
    const rows = await repo.listSavedJobs(freelancerId, cursor, limit);
    // Include savedAt so the UI can show "saved 3 days ago"
    const mapped = rows.map((j) => ({ ...toJobDTO(j), savedAt: j.saved_at }));
    return buildCursorResponse(mapped, limit, 'savedAt');
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSAL SERVICES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Submit a proposal.
// Guards (in order):
//   1. Job must exist and be open (status = 'open').
//   2. Freelancer hasn't already submitted (UNIQUE check before DB constraint hit).
// proposals_count is incremented after a successful insert (denormalized counter).
async function submitProposal(freelancerId, jobId, data) {
    const job = await repo.findJobById(jobId);
    if (!job) throw new AppError('Job not found.', 404);
    if (job.status !== 'open') throw new AppError('This job is no longer accepting proposals.', 422);

    const existing = await repo.findProposalByJobAndFreelancer(jobId, freelancerId);
    if (existing) throw new AppError('You already submitted a proposal for this job.', 409);

    const proposal = await repo.createProposal(jobId, freelancerId, data);
    await repo.incrementProposalsCount(jobId);
    return toProposalDTO(proposal);
}

// Purpose: Edit a submitted proposal.
// Guard: status must still be 'pending'. Once a client has accepted/rejected,
// the freelancer can't change what was submitted.
async function updateProposal(freelancerId, proposalId, data) {
    const proposal = await repo.findProposalById(proposalId);
    if (!proposal) throw new AppError('Proposal not found.', 404);
    if (proposal.freelancer_id !== freelancerId) throw new AppError('Forbidden.', 403);
    if (proposal.status !== 'pending') throw new AppError('Only pending proposals can be edited.', 422);

    const updated = await repo.updateProposal(proposalId, data);
    return toProposalDTO(updated);
}

// Purpose: Freelancer withdraws their own proposal.
// Guard: only pending proposals can be withdrawn.
// Counter: decrement proposals_count since this proposal no longer counts.
async function withdrawProposal(freelancerId, proposalId) {
    const proposal = await repo.findProposalById(proposalId);
    if (!proposal) throw new AppError('Proposal not found.', 404);
    if (proposal.freelancer_id !== freelancerId) throw new AppError('Forbidden.', 403);
    if (proposal.status !== 'pending') throw new AppError('Only pending proposals can be withdrawn.', 422);

    await repo.updateProposalStatus(proposalId, 'withdrawn', null);
    await repo.decrementProposalsCount(proposal.job_id);
}

// Purpose: Client reviews all proposals on their job.
// markProposalViewed runs for all returned proposals (Promise.allSettled so
// one failing view-mark doesn't crash the whole response).
async function listProposalsForJob(clientId, jobId, cursor, limit) {
    const job = await repo.findJobById(jobId);
    if (!job) throw new AppError('Job not found.', 404);
    if (job.client_id !== clientId) throw new AppError('Forbidden.', 403);

    const rows = await repo.listProposalsForJob(jobId, cursor, limit);

    // Mark as viewed — allSettled so a single failure doesn't crash the response
    await Promise.allSettled(
        rows.slice(0, limit).map((p) => repo.markProposalViewed(p.id))
    );

    // Build rich proposal objects: proposal data + inline freelancer summary
    const mapped = rows.slice(0, limit).map((p) => ({
        ...toProposalDTO(p),
        freelancer: {
            displayName: p.freelancer_name,
            avatarUrl: p.avatar_url,
            averageRating: p.average_rating !== null ? Number(p.average_rating) : null,
            jobsCompleted: p.jobs_completed,
        },
    }));

    return buildCursorResponse(mapped, limit);
}

// Purpose: Freelancer sees all their submitted proposals with job context.
async function listMyProposals(freelancerId, cursor, limit) {
    const rows = await repo.listProposalsByFreelancer(freelancerId, cursor, limit);
    const mapped = rows.map((p) => ({
        ...toProposalDTO(p),
        job: {
            title: p.job_title,
            status: p.job_status,
            budgetType: p.budget_type,
            budgetMin: p.budget_min !== null ? Number(p.budget_min) : null,
            budgetMax: p.budget_max !== null ? Number(p.budget_max) : null,
            hourlyRateMin: p.hourly_rate_min !== null ? Number(p.hourly_rate_min) : null,
            hourlyRateMax: p.hourly_rate_max !== null ? Number(p.hourly_rate_max) : null,
        },
    }));
    return buildCursorResponse(mapped, limit);
}

// Purpose: Client accepts or rejects a proposal.
// Double ownership check: the proposal must belong to a job the client owns.
// Guard: proposal must still be pending (idempotency — can't accept twice).
async function reviewProposal(clientId, proposalId, status, clientNote) {
    const proposal = await repo.findProposalById(proposalId);
    if (!proposal) throw new AppError('Proposal not found.', 404);

    // Verify via the job — client doesn't own proposals, they own jobs
    const job = await repo.findJobById(proposal.job_id);
    if (!job || job.client_id !== clientId) throw new AppError('Forbidden.', 403);

    if (proposal.status !== 'pending') throw new AppError('Proposal is no longer pending.', 422);

    const updated = await repo.updateProposalStatus(proposalId, status, clientNote);
    return toProposalDTO(updated);
}

module.exports = {
    createJob, getJob, updateJob, deleteJob, browseJobs, getClientJobs, replaceJobSkills,
    saveJob, unsaveJob, listSavedJobs,
    submitProposal, updateProposal, withdrawProposal,
    listProposalsForJob, listMyProposals, reviewProposal,
};
