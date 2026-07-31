// src/modules/logs/logs.routes.js
// Public endpoint that accepts structured log entries from the browser
// and re-emits them through the server pino logger so both terminals share
// one correlation-aware structured stream.
//
// Security notes:
//   - Public (no auth) so anonymous users on the login/register pages can ship errors.
//   - Rate limited by generalLimiter (already applied globally).
//   - Payload capped by the global 100 KB body limit.
//   - Zod-validated shape; unknown fields are stripped.
//   - `warn` and `error` levels only — the client never ships debug/info.

'use strict';

const express = require('express');
const { z } = require('zod');
const validate = require('../../middleware/validate');
const logger = require('../../config/logger');

const router = express.Router();

const clientLogSchema = z.object({
  entries: z
    .array(
      z.object({
        timestamp: z.string().min(1),
        level: z.enum(['warn', 'error']),
        correlationId: z.string().max(100).optional(),
        action: z.string().max(120),
        message: z.string().max(2000),
        meta: z.record(z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(20), // small batch cap
});

router.post('/client', validate(clientLogSchema), (req, res) => {
  const { entries } = req.body;

  for (const entry of entries) {
    logger[entry.level]({
      source: 'client',
      correlationId: entry.correlationId,
      action: entry.action,
      message: entry.message,
      clientTimestamp: entry.timestamp,
      meta: entry.meta,
      requestId: req.requestId,
    });
  }

  res.status(204).end();
});

module.exports = router;
