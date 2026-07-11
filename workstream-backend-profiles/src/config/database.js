// src/config/database.js
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10, // max connections in the pool — tune against your Postgres max_connections
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 5000,
});

// Without this handler, an error on an idle pooled client (e.g. the DB
// restarting) can crash the entire Node process unhandled.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Every repository function goes through this wrapper. Logging slow
// queries here is the cheapest possible head start on the query
// profiling work that becomes formal in Milestone 10.
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 100) {
    console.warn(`[slow query] ${duration}ms: ${text.slice(0, 80)}...`);
  }

  return result;
}

async function closePool() {
  await pool.end();
}

// Runs `fn` inside a BEGIN/COMMIT transaction using a single dedicated
// client. Any error inside `fn` triggers a ROLLBACK so the database
// never ends up in a half-written state — e.g. "deleted the freelancer's
// old skill set but the new one failed to insert."
//
// `fn` receives a client with the SAME `.query()` signature as the pool,
// but every call inside it happens on this one connection so they share
// the transaction.
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
  }
}

module.exports = { pool, query, closePool, withTransaction };
