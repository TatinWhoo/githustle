// src/modules/projects/projects.controller.js
const asyncHandler = require('../../middleware/asyncHandler');
const service = require('./projects.service');

// ── Projects ────────────────────────────────────────────────────────────────

// req.user.id = clientId (set by authenticate middleware)
// req.params.proposalId = the proposal to activate
const createProjectFromProposal = asyncHandler(async (req, res) => {
    const project = await service.createProjectFromProposal(
        req.user.id,
        req.params.proposalId,
        req.body   // optional overrides: startDate, endDate, totalBudget
    );
    res.status(201).json({ status: 'success', data: { project } });
});

const listProjects = asyncHandler(async (req, res) => {
    // req.user.role is set by the authenticate middleware (decoded from JWT)
    const result = await service.listProjects(req.user.id, req.user.role, req.query);
    res.status(200).json({ status: 'success', data: result });
});

const getProject = asyncHandler(async (req, res) => {
    const project = await service.getProject(req.user.id, req.params.projectId);
    res.status(200).json({ status: 'success', data: { project } });
});

const updateProjectStatus = asyncHandler(async (req, res) => {
    const project = await service.updateProjectStatus(
        req.user.id, req.params.projectId, req.body.status
    );
    res.status(200).json({ status: 'success', data: { project } });
});

const getProjectBudget = asyncHandler(async (req, res) => {
    const budget = await service.getProjectBudget(req.user.id, req.params.projectId);
    res.status(200).json({ status: 'success', data: { budget } });
});

// ── Milestones ───────────────────────────────────────────────────────────────

const createMilestone = asyncHandler(async (req, res) => {
    const milestone = await service.createMilestone(
        req.user.id, req.params.projectId, req.body
    );
    res.status(201).json({ status: 'success', data: { milestone } });
});

const listMilestones = asyncHandler(async (req, res) => {
    const milestones = await service.listMilestones(req.user.id, req.params.projectId);
    res.status(200).json({ status: 'success', data: { milestones } });
});

const getMilestone = asyncHandler(async (req, res) => {
    const milestone = await service.getMilestone(
        req.user.id, req.params.projectId, req.params.milestoneId
    );
    res.status(200).json({ status: 'success', data: { milestone } });
});

const updateMilestone = asyncHandler(async (req, res) => {
    const milestone = await service.updateMilestone(
        req.user.id, req.params.projectId, req.params.milestoneId, req.body
    );
    res.status(200).json({ status: 'success', data: { milestone } });
});

const deleteMilestone = asyncHandler(async (req, res) => {
    await service.deleteMilestone(
        req.user.id, req.params.projectId, req.params.milestoneId
    );
    res.status(204).send();
});

const updateMilestoneStatus = asyncHandler(async (req, res) => {
    const { status, rejectionReason } = req.body;
    const milestone = await service.updateMilestoneStatus(
        req.user.id,
        req.user.role,    // service needs role to validate the transition
        req.params.projectId,
        req.params.milestoneId,
        status,
        { rejectionReason }
    );
    res.status(200).json({ status: 'success', data: { milestone } });
});

// ── Deliverables ─────────────────────────────────────────────────────────────

const uploadDeliverable = asyncHandler(async (req, res) => {
    const deliverable = await service.uploadDeliverable(
        req.user.id,
        req.params.projectId,
        req.params.milestoneId,
        req.file,           // set by Multer middleware
        req.body.note       // optional text note alongside the file
    );
    res.status(201).json({ status: 'success', data: { deliverable } });
});

const listDeliverables = asyncHandler(async (req, res) => {
    const deliverables = await service.listDeliverables(
        req.user.id, req.params.projectId, req.params.milestoneId
    );
    res.status(200).json({ status: 'success', data: { deliverables } });
});

const deleteDeliverable = asyncHandler(async (req, res) => {
    await service.deleteDeliverable(
        req.user.id,
        req.params.projectId,
        req.params.milestoneId,
        req.params.deliverableId
    );
    res.status(204).send();
});

module.exports = {
    createProjectFromProposal,
    listProjects, getProject, updateProjectStatus, getProjectBudget,
    createMilestone, listMilestones, getMilestone, updateMilestone,
    deleteMilestone, updateMilestoneStatus,
    uploadDeliverable, listDeliverables, deleteDeliverable,
};
