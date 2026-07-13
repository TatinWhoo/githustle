// src/modules/jobs/jobs.controller.js
const asyncHandler = require('../../middleware/asyncHandler');
const service = require('./jobs.service');

// ─────────────────────────────────────────────────────────────────────────────
// asyncHandler wraps every controller so you don't need try/catch everywhere.
// If the async function throws (including AppError), asyncHandler passes the
// error to Express's next() which routes it to globalErrorHandler.
// ─────────────────────────────────────────────────────────────────────────────

// ── Jobs ────────────────────────────────────────────────────────────────────

// req.user.id is set by the authenticate middleware (decoded from JWT)
const createJob = asyncHandler(async (req, res) => {
    const job = await service.createJob(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { job } });
});

// Public route — no req.user, just query params (already Zod-validated)
const browseJobs = asyncHandler(async (req, res) => {
    const result = await service.browseJobs(req.query);
    res.status(200).json({ status: 'success', data: result });
});

// req.params.jobId was validated as a UUID by jobIdParamSchema in the route
const getJob = asyncHandler(async (req, res) => {
    const job = await service.getJob(req.params.jobId);
    res.status(200).json({ status: 'success', data: { job } });
});

const updateJob = asyncHandler(async (req, res) => {
    const job = await service.updateJob(req.user.id, req.params.jobId, req.body);
    res.status(200).json({ status: 'success', data: { job } });
});

// 204 No Content — standard response for successful DELETE with no body
const deleteJob = asyncHandler(async (req, res) => {
    await service.deleteJob(req.user.id, req.params.jobId);
    res.status(204).send();
});

const getClientJobs = asyncHandler(async (req, res) => {
    const result = await service.getClientJobs(req.user.id, req.query);
    res.status(200).json({ status: 'success', data: result });
});

const replaceJobSkills = asyncHandler(async (req, res) => {
    const skills = await service.replaceJobSkills(req.user.id, req.params.jobId, req.body.skills);
    res.status(200).json({ status: 'success', data: { skills } });
});

// ── Saved jobs ───────────────────────────────────────────────────────────────

const saveJob = asyncHandler(async (req, res) => {
    await service.saveJob(req.user.id, req.params.jobId);
    res.status(200).json({ status: 'success', message: 'Job saved.' });
});

const unsaveJob = asyncHandler(async (req, res) => {
    await service.unsaveJob(req.user.id, req.params.jobId);
    res.status(204).send();
});

// cursor/limit come from query string — cast limit to Number since query params are strings
const listSavedJobs = asyncHandler(async (req, res) => {
    const { cursor, limit = 20 } = req.query;
    const result = await service.listSavedJobs(req.user.id, cursor, Number(limit));
    res.status(200).json({ status: 'success', data: result });
});

// ── Proposals ────────────────────────────────────────────────────────────────

const submitProposal = asyncHandler(async (req, res) => {
    const proposal = await service.submitProposal(req.user.id, req.params.jobId, req.body);
    res.status(201).json({ status: 'success', data: { proposal } });
});

const updateProposal = asyncHandler(async (req, res) => {
    const proposal = await service.updateProposal(req.user.id, req.params.proposalId, req.body);
    res.status(200).json({ status: 'success', data: { proposal } });
});

const withdrawProposal = asyncHandler(async (req, res) => {
    await service.withdrawProposal(req.user.id, req.params.proposalId);
    res.status(204).send();
});

const listProposalsForJob = asyncHandler(async (req, res) => {
    const { cursor, limit = 20 } = req.query;
    const result = await service.listProposalsForJob(
        req.user.id, req.params.jobId, cursor, Number(limit)
    );
    res.status(200).json({ status: 'success', data: result });
});

const listMyProposals = asyncHandler(async (req, res) => {
    const { cursor, limit = 20 } = req.query;
    const result = await service.listMyProposals(req.user.id, cursor, Number(limit));
    res.status(200).json({ status: 'success', data: result });
});

const reviewProposal = asyncHandler(async (req, res) => {
    const { status, clientNote } = req.body;
    const proposal = await service.reviewProposal(
        req.user.id, req.params.proposalId, status, clientNote
    );
    res.status(200).json({ status: 'success', data: { proposal } });
});

module.exports = {
    createJob, browseJobs, getJob, updateJob, deleteJob, getClientJobs, replaceJobSkills,
    saveJob, unsaveJob, listSavedJobs,
    submitProposal, updateProposal, withdrawProposal,
    listProposalsForJob, listMyProposals, reviewProposal,
};
