// src/modules/ai/ai.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const { aiLimiter } = require('../../middleware/rateLimiter');
const controller = require('./ai.controller');
const {
    generateProposalSchema,
    analyzeContractSchema,
    draftFollowUpSchema,
} = require('./ai.validation');

const router = express.Router();

// Apply AI-specific rate limit to all routes in this router
// (10 req/min per IP — tighter than the global 100/15min limit
// because each call hits the Claude API and costs tokens)
router.use(aiLimiter);

// POST /api/v1/ai/generate-proposal
// SSE streaming response — freelancer only
// Returns text/event-stream with Claude's token-by-token output
router.post(
    '/generate-proposal',
    authenticate,
    requireRole('freelancer'),
    validate(generateProposalSchema),
    controller.generateProposal
);

// POST /api/v1/ai/analyze-contract
// Non-streaming JSON response — both roles can analyze contracts
// Body parser override: contract text can be up to 15KB, above the global 10KB limit
router.post(
    '/analyze-contract',
    authenticate,
    express.json({ limit: '20kb' }),
    validate(analyzeContractSchema),
    controller.analyzeContract
);

// POST /api/v1/ai/draft-follow-up
// Non-streaming JSON response — freelancer only
router.post(
    '/draft-follow-up',
    authenticate,
    requireRole('freelancer'),
    validate(draftFollowUpSchema),
    controller.draftFollowUp
);

module.exports = router;
