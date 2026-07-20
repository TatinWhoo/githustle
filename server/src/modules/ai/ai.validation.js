// src/modules/ai/ai.validation.js
const { z } = require('zod');

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSAL GENERATOR
// Purpose: Accepts a jobId to fetch the full job context server-side.
//   We DON'T let the client send arbitrary text to be echoed into the prompt —
//   fetching the job from DB prevents prompt injection via the job description.
//
//   Optional fields let the freelancer add personal context to the prompt.
// ─────────────────────────────────────────────────────────────────────────────

const generateProposalSchema = z.object({
    jobId:           z.string().uuid(),
    // Optional context the freelancer provides to personalize the AI output
    relevantSkills:  z.string().trim().max(500).optional(), // "React, Node.js, etc."
    yearsExperience: z.coerce.number().int().min(0).max(50).optional(),
    tone:            z.enum(['professional', 'friendly', 'concise']).default('professional'),
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT RISK ANALYZER
// Purpose: User pastes contract text for AI analysis.
//
// Prompt injection defense:
//   The contract text is inserted into a structured prompt with clear delimiters
//   (XML tags) and explicit instructions to ONLY analyze the text, never follow
//   instructions found within it. Additionally, the max length is capped.
// ─────────────────────────────────────────────────────────────────────────────

const analyzeContractSchema = z.object({
    contractText: z.string().trim()
        .min(50, 'Contract text must be at least 50 characters')
        .max(15000, 'Contract text too long (max 15,000 characters)'),
});

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW-UP EMAIL DRAFTER
// Purpose: Generates a professional follow-up email for an overdue invoice.
//   Context is fetched server-side from the invoiceId (never trust client text).
// ─────────────────────────────────────────────────────────────────────────────

const draftFollowUpSchema = z.object({
    invoiceId: z.string().uuid(),
    tone:      z.enum(['polite', 'firm', 'urgent']).default('polite'),
});

module.exports = {
    generateProposalSchema,
    analyzeContractSchema,
    draftFollowUpSchema,
};