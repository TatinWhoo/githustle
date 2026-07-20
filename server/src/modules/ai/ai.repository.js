// src/modules/ai/ai.repository.js
const { query } = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// AI USAGE TRACKING
// Purpose: Enforce monthly AI proposal generation quota per user.
//
// How it works:
//   ai_proposal_usage tracks usage per user per calendar month.
//   On first use of the month, UPSERT creates the row with count=1.
//   On subsequent uses, count is incremented.
//   The service checks count < quota before calling Claude.
//
// Why UPSERT (INSERT ... ON CONFLICT)?
//   Avoids race conditions where two concurrent requests both see count=0
//   and both try to INSERT. The ON CONFLICT UPDATE atomically increments.
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Get current month's usage count for a user.
// Returns { count: 0 } if no row exists yet (first use this month).
async function getMonthlyUsage(userId) {
    const { rows } = await query(
        `SELECT count FROM ai_proposal_usage
         WHERE user_id = $1
           AND period_month = DATE_TRUNC('month', CURRENT_DATE)::DATE`,
        [userId]
    );
    return rows[0]?.count ?? 0;
}

// Purpose: Atomically increment usage count for the current month.
// Creates the row if it doesn't exist (first AI call this month).
async function incrementUsage(userId) {
    const { rows } = await query(
        `INSERT INTO ai_proposal_usage (user_id, period_month, count)
         VALUES ($1, DATE_TRUNC('month', CURRENT_DATE)::DATE, 1)
         ON CONFLICT (user_id, period_month)
         DO UPDATE SET count = ai_proposal_usage.count + 1,
                       updated_at = NOW()
         RETURNING count`,
        [userId]
    );
    return rows[0].count;
}

// Purpose: Check if user has unlimited AI access via subscription plan.
// Returns true if the user's active subscription plan has ai_proposals_unlimited = TRUE.
async function hasUnlimitedAI(userId) {
    const { rows } = await query(
        `SELECT sp.ai_proposals_unlimited
         FROM user_subscriptions us
         JOIN subscription_plans sp ON sp.id = us.plan_id
         WHERE us.user_id = $1
           AND us.status IN ('active', 'trialing')
           AND us.current_period_end > NOW()
         ORDER BY us.created_at DESC
         LIMIT 1`,
        [userId]
    );
    return rows[0]?.ai_proposals_unlimited === true;
}

module.exports = {
    getMonthlyUsage, incrementUsage, hasUnlimitedAI,
};
