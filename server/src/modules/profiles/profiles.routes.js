// src/modules/profiles/profiles.routes.js
const express = require('express');
const env = require('../../config/env');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const { uploadSingleImage } = require('../../middleware/upload');
const controller = require('./profiles.controller');
const {
  createFreelancerProfileSchema,
  updateFreelancerProfileSchema,
  createClientProfileSchema,
  updateClientProfileSchema,
  replaceSkillsSchema,
  createPortfolioItemSchema,
  updatePortfolioItemSchema,
  portfolioItemIdParamSchema,
  searchFreelancersQuerySchema,
  userIdParamSchema,
} = require('./profiles.validation');

const router = express.Router();

// Derive MB limits from env
const AVATAR_MAX_SIZE_MB = env.MAX_FILE_SIZE / (1024 * 1024);
const PORTFOLIO_MAX_SIZE_MB = env.PORTFOLIO_IMAGE_MAX_SIZE_MB;

// ── Skills (public) ───────────────────────────────────────────
router.get('/skills', controller.listSkills);

// ── Freelancer profiles ───────────────────────────────────────
// Static routes before dynamic :userId
router.get('/freelancers', validate(searchFreelancersQuerySchema, 'query'), controller.searchFreelancers);
router.get('/freelancers/me', authenticate, requireRole('freelancer'), controller.getOwnFreelancerProfile);

router.post('/freelancers', authenticate, requireRole('freelancer'), validate(createFreelancerProfileSchema), controller.createFreelancerProfile);
router.put('/freelancers/me', authenticate, requireRole('freelancer'), validate(updateFreelancerProfileSchema), controller.updateFreelancerProfile);
router.get('/freelancers/:userId', validate(userIdParamSchema, 'params'), controller.getPublicFreelancerProfile);
router.post('/freelancers/me/avatar', authenticate, requireRole('freelancer'), uploadSingleImage('image', AVATAR_MAX_SIZE_MB), controller.uploadFreelancerAvatar);

// ── Skill tagging ─────────────────────────────────────────────
router.put('/freelancers/me/skills', authenticate, requireRole('freelancer'), validate(replaceSkillsSchema), controller.replaceFreelancerSkills);

// ── Portfolio ─────────────────────────────────────────────────
router.post('/freelancers/me/portfolio', authenticate, requireRole('freelancer'), validate(createPortfolioItemSchema), controller.addPortfolioItem);
router.put('/freelancers/me/portfolio/:id', authenticate, requireRole('freelancer'), validate(portfolioItemIdParamSchema, 'params'), validate(updatePortfolioItemSchema), controller.updatePortfolioItem);
router.delete('/freelancers/me/portfolio/:id', authenticate, requireRole('freelancer'), validate(portfolioItemIdParamSchema, 'params'), controller.deletePortfolioItem);
router.post('/freelancers/me/portfolio-image', authenticate, requireRole('freelancer'), uploadSingleImage('image', PORTFOLIO_MAX_SIZE_MB), controller.uploadPortfolioImage);

// ── Client profiles ───────────────────────────────────────────
router.get('/clients/me', authenticate, requireRole('client'), controller.getOwnClientProfile);
router.post('/clients', authenticate, requireRole('client'), validate(createClientProfileSchema), controller.createClientProfile);
router.put('/clients/me', authenticate, requireRole('client'), validate(updateClientProfileSchema), controller.updateClientProfile);
router.get('/clients/:userId', validate(userIdParamSchema, 'params'), controller.getPublicClientProfile);
router.post('/clients/me/avatar', authenticate, requireRole('client'), uploadSingleImage('image', AVATAR_MAX_SIZE_MB), controller.uploadClientAvatar);

module.exports = router;
