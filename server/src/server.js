// src/server.js
const env = require('./config/env');
const app = require('./app');
const { pool, closePool } = require('./config/database');

const server = app.listen(env.PORT, () => {
  console.log(`🚀 GitHustle API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

pool
  .query('SELECT 1')
  .then(() => console.log('✅ PostgreSQL connection verified'))
  .catch((err) => {
    console.error('❌ Could not connect to PostgreSQL:', err.message);
    console.warn('⚠️  Server continuing without verified DB connection. Check DATABASE_URL.');
    // Don't exit — let the server keep running so health check works.
    // Individual requests will fail at query time if DB is unreachable.
  });

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await closePool();
    console.log('Closed out remaining connections.');
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
