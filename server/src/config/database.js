'use strict';

const { Pool } = require('pg');
const env = require('./env');
const logger = require('./logger');

// ── Pool configuration ────────────────────────────────────────────────────────
const isProd = env.NODE_ENV === 'production';
const poolMax = env.DB_POOL_MAX !== undefined
  ? env.DB_POOL_MAX
  : (isProd ? 10 : 5);

const poolConfig = {
  connectionString: env.DATABASE_URL,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: env.DB_CONNECT_TIMEOUT
    ? parseInt(env.DB_CONNECT_TIMEOUT, 10)
    : 5000,
};

// Production: enforce SSL with server certificate validation (Req 16.1)
if (isProd) {
  poolConfig.ssl = { rejectUnauthorized: true };
}

const pool = new Pool(poolConfig);

// ── Per-connection setup ──────────────────────────────────────────────────────
// Set statement and idle-in-transaction timeouts on every new connection (Req 16.3)
pool.on('connect', async (client) => {
  const stmtMs = env.DB_STATEMENT_TIMEOUT_MS ?? 5000;
  const idleTxMs = env.DB_IDLE_TX_TIMEOUT_MS ?? 10000;
  try {
    await client.query(
      `SET statement_timeout = ${stmtMs}; SET idle_in_transaction_session_timeout = ${idleTxMs};`
    );
  } catch (err) {
    logger.error({ err }, 'db: failed to set session timeouts on new connection');
  }
});

// ── Idle-client error handler ─────────────────────────────────────────────────
// Log but do NOT exit — pool manages reconnection (Req 16.6)
pool.on('error', (err) => {
  logger.error({ err }, 'db: unexpected idle client error');
});

// ── Pool utilisation monitoring ───────────────────────────────────────────────
// Emit a warn once when utilisation crosses from < 0.8 to >= 0.8; suppress
// subsequent warns while still above threshold (debounce, Req 16.2)
let _highUtilWarned = false;

function checkPoolUtilization() {
  const { totalCount, idleCount, waitingCount } = pool;
  // totalCount = checked-out + idle connections
  void idleCount; void waitingCount; // destructured for potential future use
  const ratio = totalCount / poolMax;
  if (ratio >= 0.8 && !_highUtilWarned) {
    _highUtilWarned = true;
    logger.warn(
      { totalCount, poolMax, utilizationRatio: ratio.toFixed(2) },
      'db: pool_high_utilization — pool utilisation >= 80%'
    );
  } else if (ratio < 0.8 && _highUtilWarned) {
    // Reset so the warning fires again if utilisation climbs again
    _highUtilWarned = false;
  }
}

// ── Query wrapper ─────────────────────────────────────────────────────────────
// All repository calls go through here for slow-query logging (Req 16.5)
async function query(text, params, { requestId } = {}) {
  checkPoolUtilization();

  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 500) {
    logger.warn(
      { duration, text: text.slice(0, 200), requestId },
      'db: slow query'
    );
  }

  return result;
}

// ── Transaction helper ────────────────────────────────────────────────────────
// Runs fn inside BEGIN/COMMIT; rolls back on any throw.
// fn receives a client with the same .query() signature as the pool.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    checkPoolUtilization();
  }
}

async function closePool() {
  await pool.end();
}

module.exports = { pool, query, closePool, withTransaction };
