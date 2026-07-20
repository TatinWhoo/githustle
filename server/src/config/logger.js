// src/config/logger.js
// Purpose: Structured JSON logger using pino.
//
// Why pino?
//   - 5-10x faster than winston (no serialisation overhead)
//   - Outputs JSON by default — grep-friendly, Datadog/ELK-ready
//   - pino-pretty formats for human reading in development
//
// Usage: const logger = require('../config/logger');
//        logger.info({ userId, action }, 'User banned');
const pino = require('pino');
const env = require('./env');

const logger = pino({
    level: env.LOG_LEVEL,
    // In production, raw JSON for log aggregators. In dev, pretty-print.
    ...(env.NODE_ENV === 'development' && {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
    }),
});

module.exports = logger;
