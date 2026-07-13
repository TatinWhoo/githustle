// src/server.js
// Purpose: Create the HTTP server from the Express app, attach Socket.io,
// then start listening.
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

// Create the Node HTTP server from the Express app.
// Socket.io will attach to this same server so HTTP and WebSocket
// traffic share one port.
const server = http.createServer(app);

(async () => {
    try {
        // Attach Socket.io (also connects Redis adapter if REDIS_URL is set)
        await initSocket(server);

        server.listen(env.PORT, () => {
            console.log(`🚀 GitHustle API running on port ${env.PORT} [${env.NODE_ENV}]`);
            console.log('🔌 Socket.io ready');
        });

        // Verify DB connection after server starts (non-blocking)
        pool.query('SELECT 1')
            .then(() => console.log('✅ PostgreSQL connection verified'))
            .catch((err) => {
                console.error('❌ Could not connect to PostgreSQL:', err.message);
                console.warn('⚠️  Server continuing without verified DB connection. Check DATABASE_URL.');
                // Don't exit — let health check still respond.
                // Individual requests will fail at query time if DB is unreachable.
            });

    } catch (err) {
        console.error('Failed to start server:', err);
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
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        await closePool();
        console.log('Closed out remaining connections.');
        process.exit(0);
    });

    // Force-kill after 10 seconds if graceful shutdown stalls
    setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
