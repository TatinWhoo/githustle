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

// ── Skills (public lookup) ───────────────────────────────────
router.get('/skills', controller.listSkills);

// ── Freelancer profile ───────────────────────────────────────
// Public browse/search FIRST — otherwise Express would try to match
// "/freelancers" against "/freelancers/:userId" style routes below it
// in declaration order. Route order matters in Express; more specific
// and static paths go before dynamic ":param" ones.
router.get(
  '/freelancers',
  validate(searchFreelancersQuerySchema, 'query'),
  controller.searchFreelancers
);

router.get('/freelancers/me', authenticate, requireRole('freelancer'), controller.getOwnFreelancerProfile);

router.post(
  '/freelancers',
  authenticate,
  requireRole('freelancer'),
  validate(createFreelancerProfileSchema),
  controller.createFreelancerProfile
);

router.put(
  '/freelancers/me',
  authenticate,
  requireRole('freelancer'),
  validate(updateFreelancerProfileSchema),
  controller.updateFreelancerProfile
);

router.get(
  '/freelancers/:userId',
  validate(userIdParamSchema, 'params'),
  controller.getPublicFreelancerProfile
);

router.post(
  '/freelancers/me/avatar',
  authenticate,
  requireRole('freelancer'),
  uploadSingleImage('image', env.AVATAR_MAX_SIZE_MB),
  controller.uploadFreelancerAvatar
);

// ── Skill tagging ─────────────────────────────────────────────
router.put(
  '/freelancers/me/skills',
  authenticate,
  requireRole('freelancer'),
  validate(replaceSkillsSchema),
  controller.replaceFreelancerSkills
);

// ── Portfolio ─────────────────────────────────────────────────
router.post(
  '/freelancers/me/portfolio',
  authenticate,
  requireRole('freelancer'),
  validate(createPortfolioItemSchema),
  controller.addPortfolioItem
);

router.put(
  '/freelancers/me/portfolio/:id',
  authenticate,
  requireRole('freelancer'),
  validate(portfolioItemIdParamSchema, 'params'),
  validate(updatePortfolioItemSchema),
  controller.updatePortfolioItem
);

router.delete(
  '/freelancers/me/portfolio/:id',
  authenticate,
  requireRole('freelancer'),
  validate(portfolioItemIdParamSchema, 'params'),
  controller.deletePortfolioItem
);

router.post(
  '/freelancers/me/portfolio-image',
  authenticate,
  requireRole('freelancer'),
  uploadSingleImage('image', env.PORTFOLIO_IMAGE_MAX_SIZE_MB),
  controller.uploadPortfolioImage
);

// ── Client profile ───────────────────────────────────────────
router.get('/clients/me', authenticate, requireRole('client'), controller.getOwnClientProfile);

router.post(
  '/clients',
  authenticate,
  requireRole('client'),
  validate(createClientProfileSchema),
  controller.createClientProfile
);

router.put(
  '/clients/me',
  authenticate,
  requireRole('client'),
  validate(updateClientProfileSchema),
  controller.updateClientProfile
);

router.get(
  '/clients/:userId',
  validate(userIdParamSchema, 'params'),
  controller.getPublicClientProfile
);

router.post(
  '/clients/me/avatar',
  authenticate,
  requireRole('client'),
  uploadSingleImage('image', env.AVATAR_MAX_SIZE_MB),
  controller.uploadClientAvatar
);

module.exports = router;
