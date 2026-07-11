// src/modules/profiles/profiles.controller.js
const asyncHandler = require('../../middleware/asyncHandler');
const AppError = require('../../utils/AppError');
const service = require('./profiles.service');

// ── Freelancer profile ───────────────────────────────────────

const createFreelancerProfile = asyncHandler(async (req, res) => {
  const profile = await service.createFreelancerProfile(req.user.id, req.body);
  res.status(201).json({ status: 'success', data: { profile } });
});

const getOwnFreelancerProfile = asyncHandler(async (req, res) => {
  const profile = await service.getOwnFreelancerProfile(req.user.id);
  res.status(200).json({ status: 'success', data: { profile } });
});

const getPublicFreelancerProfile = asyncHandler(async (req, res) => {
  const profile = await service.getPublicFreelancerProfile(req.params.userId);
  res.status(200).json({ status: 'success', data: { profile } });
});

const updateFreelancerProfile = asyncHandler(async (req, res) => {
  const profile = await service.updateFreelancerProfile(req.user.id, req.body);
  res.status(200).json({ status: 'success', data: { profile } });
});

const searchFreelancers = asyncHandler(async (req, res) => {
  const result = await service.searchFreelancers(req.query);
  res.status(200).json({ status: 'success', data: result });
});

// ── Client profile ───────────────────────────────────────────

const createClientProfile = asyncHandler(async (req, res) => {
  const profile = await service.createClientProfile(req.user.id, req.body);
  res.status(201).json({ status: 'success', data: { profile } });
});

const getOwnClientProfile = asyncHandler(async (req, res) => {
  const profile = await service.getOwnClientProfile(req.user.id);
  res.status(200).json({ status: 'success', data: { profile } });
});

const getPublicClientProfile = asyncHandler(async (req, res) => {
  const profile = await service.getPublicClientProfile(req.params.userId);
  res.status(200).json({ status: 'success', data: { profile } });
});

const updateClientProfile = asyncHandler(async (req, res) => {
  const profile = await service.updateClientProfile(req.user.id, req.body);
  res.status(200).json({ status: 'success', data: { profile } });
});

// ── Skills ────────────────────────────────────────────────────

const listSkills = asyncHandler(async (req, res) => {
  const skills = await service.listSkills(req.query.category);
  res.status(200).json({ status: 'success', data: { skills } });
});

const replaceFreelancerSkills = asyncHandler(async (req, res) => {
  const skills = await service.replaceFreelancerSkills(req.user.id, req.body.skills);
  res.status(200).json({ status: 'success', data: { skills } });
});

// ── Portfolio ─────────────────────────────────────────────────

const addPortfolioItem = asyncHandler(async (req, res) => {
  const item = await service.addPortfolioItem(req.user.id, req.body);
  res.status(201).json({ status: 'success', data: { item } });
});

const updatePortfolioItem = asyncHandler(async (req, res) => {
  const item = await service.updatePortfolioItem(req.user.id, req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { item } });
});

const deletePortfolioItem = asyncHandler(async (req, res) => {
  await service.deletePortfolioItem(req.user.id, req.params.id);
  res.status(204).send();
});

// ── Uploads ───────────────────────────────────────────────────
// Multer (applied at the route level) populates req.file. If no file
// was attached at all, that's a 400 caught here before it ever reaches
// the service layer.

function requireFile(req) {
  if (!req.file) {
    throw new AppError('No file was uploaded. Attach an image under the "image" field.', 400);
  }
}

const uploadFreelancerAvatar = asyncHandler(async (req, res) => {
  requireFile(req);
  const result = await service.uploadFreelancerAvatar(req.user.id, req.file);
  res.status(200).json({ status: 'success', data: result });
});

const uploadClientAvatar = asyncHandler(async (req, res) => {
  requireFile(req);
  const result = await service.uploadClientAvatar(req.user.id, req.file);
  res.status(200).json({ status: 'success', data: result });
});

const uploadPortfolioImage = asyncHandler(async (req, res) => {
  requireFile(req);
  const result = await service.uploadPortfolioImage(req.user.id, req.file);
  res.status(200).json({ status: 'success', data: result });
});

module.exports = {
  createFreelancerProfile,
  getOwnFreelancerProfile,
  getPublicFreelancerProfile,
  updateFreelancerProfile,
  searchFreelancers,
  createClientProfile,
  getOwnClientProfile,
  getPublicClientProfile,
  updateClientProfile,
  listSkills,
  replaceFreelancerSkills,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  uploadFreelancerAvatar,
  uploadClientAvatar,
  uploadPortfolioImage,
};
