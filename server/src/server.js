// src/server.js
// Purpose: Create the HTTP server from the Express app, attach Socket.io,
// then start listening.

// MUST be first — Sentry instruments require() calls
const { initSentry } = require('./utils/sentry');
initSentry();
const logger = require('./config/logger');
const { checkModuleLayout } = require('./boot/checkModuleLayout');
//
// Why split app.js and server.js?
//   Socket.io needs the raw http.Server instance, not the Express app.
//   app.js stays pure Express (importable in tests without booting the server).
//   server.js owns the lifecycle: create → attach socket → listen → shutdown.
const http = require('http');
const env = require('./config/env');
const app = require('./app');
const { pool, closePool } = require('./config/database');
const { initSocket } = require('./socket');
const { scheduleOverdueCheck } = require('./modules/queues/overdueReminder.queue');
const { startOverdueWorker } = require('./modules/queues/overdueReminder.worker');
const { startEmailWorker } = require('./modules/queues/email.worker');
const { initRateLimiters } = require('./middleware/rateLimiter');
const authProviderRegistry = require('./modules/auth/auth-provider');
const localJwtProvider = require('./modules/auth/providers/localJwtProvider');
const clerkProvider = require('./modules/auth/providers/clerkProvider');

// Create the Node HTTP server from the Express app.
// Socket.io will attach to this same server so HTTP and WebSocket
// traffic share one port.
const server = http.createServer(app);

(async () => {
    try {
        // Verify module layout before opening any connections
        checkModuleLayout();

        // Register and select the auth provider (must run before initSocket or
        // any request handler that calls authProvider.active)
        authProviderRegistry.register('local', localJwtProvider);
        authProviderRegistry.register('clerk', clerkProvider);
        authProviderRegistry.select(env.AUTH_PROVIDER);
        logger.info({ provider: env.AUTH_PROVIDER }, 'Auth provider selected');

        // Initialise Redis-backed rate limiters (falls back to in-memory on error)
        await initRateLimiters();

        // Attach Socket.io (also connects Redis adapter if REDIS_URL is set)
        await initSocket(server);

        // Start BullMQ overdue reminder queue + worker.
        // Wrapped in try/catch so a missing/unreachable Redis doesn't crash startup.
        // The queue schedules a repeating cron every 6 hours.
        // The worker processes those jobs by marking overdue invoices.
        try {
            await scheduleOverdueCheck();
            startOverdueWorker();
            startEmailWorker();
        } catch (err) {
            logger.warn({ err: err.message }, 'BullMQ could not start (Redis unavailable?)');
        }

        server.listen(env.PORT, () => {
            logger.info({ port: env.PORT, env: env.NODE_ENV }, 'GitHustle API started');
            logger.info('Socket.io ready');
        });

        // Verify DB connection after server starts (non-blocking)
        pool.query('SELECT 1')
            .then(() => logger.info('PostgreSQL connection verified'))
            .catch((err) => {
                logger.error({ err: err.message }, 'Could not connect to PostgreSQL');
                logger.warn('Server continuing without verified DB connection. Check DATABASE_URL.');
                // Don't exit — let health check still respond.
                // Individual requests will fail at query time if DB is unreachable.
            });

    } catch (err) {
        logger.error({ err }, 'Failed to start server');
        process.exit(1);
    }
})();

// ─────────────────────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// Purpose: On SIGTERM/SIGINT (Docker stop, Ctrl+C), stop accepting new
// connections, wait for in-flight requests to complete, then close the DB pool.
// The 10s hard timeout prevents hanging indefinitely on stuck requests.
// ─────────────────────────────────────────────────────────────────────────────

function shutdown(signal) {
    logger.info({ signal }, 'Shutdown signal received. Shutting down gracefully...');
    server.close(async () => {
        await closePool();
        logger.info('Closed out remaining connections.');
        process.exit(0);
    });

    // Force-kill after 10 seconds if graceful shutdown stalls
    setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
