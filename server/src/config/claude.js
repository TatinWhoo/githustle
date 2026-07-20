// src/config/claude.js
// Purpose: Singleton Anthropic SDK client used by ai.service.js.
//
// Why a singleton?
//   The Anthropic SDK maintains an internal HTTP connection pool.
//   Creating one per request would waste connections and hit rate limits faster.
//   One instance per process is the recommended pattern.
//
// Why not import env at module level?
//   env.js has already been loaded by the time any route handler runs —
//   we're safe to import it synchronously here.
const Anthropic = require('@anthropic-ai/sdk');
const env = require('./env');

const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
});


// Model config — centralised so all AI features use the same model.
// claude-haiku-3-5-20241022 balances speed and quality for real-time streaming.
// If you need higher quality for contract analysis, you can override per-call.
const MODEL = 'claude-haiku-3-5-20241022'; // cheaper model for the testing
const MAX_TOKENS = 2048;

module.exports = { anthropic, MODEL, MAX_TOKENS };