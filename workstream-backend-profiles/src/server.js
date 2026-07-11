// src/server.js
const env = require('./config/env');
const app = require('./app');
const { pool, closePool } = require('./config/database');

const server = app.listen(env.PORT, () => {
  console.log(`🚀 WorkStream API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Verify the database is actually reachable on boot — fail fast instead
// of silently accepting requests that will all 500 on their first query.
pool
  .query('SELECT 1')
  .then(() => console.log('✅ PostgreSQL connection verified'))
  .catch((err) => {
    console.error('❌ Could not connect to PostgreSQL:', err.message);
    process.exit(1);
  });

// Graceful shutdown — full readiness probes and zero-downtime deploys
// come in Milestone 10, but even now we should stop accepting new
// connections and close the DB pool cleanly before exiting, instead of
// killing in-flight requests mid-response.
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await closePool();
    console.log('Closed out remaining connections.');
    process.exit(0);
  });

  // Force-exit if shutdown hangs for more than 10s.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
