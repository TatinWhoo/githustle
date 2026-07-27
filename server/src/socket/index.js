// src/socket/index.js
// Purpose: All Socket.io logic in one place — hardened per security spec task 17.1.
//   - Origin allowlist gate before token verification
//   - Token verification via Auth_Provider_Interface (attaches tokenExp)
//   - Zod schema validation per event
//   - Per-socket token-bucket rate limit (30 events / 10s sliding window)
//   - 32 KB max payload cap (server option + manual guard)
//   - join_project membership check
//   - Token expiry check on every event handler
//   - @socket.io/redis-adapter for cross-process fan-out
//   - All console.* replaced with logger.*

'use strict';

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const { z } = require('zod');
const authProvider = require('../modules/auth/auth-provider');
const authRepo = require('../modules/auth/auth.repository');
const env = require('../config/env');
const logger = require('../config/logger');
const messagesService = require('../modules/messages/messages.service');
const projectsRepo = require('../modules/projects/projects.repository');
const originMatcher = require('../security/originMatcher');

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Parse CORS_ORIGINS once at startup
const corsOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

// Allow any http://localhost:* when running in development
const devLocalhost = env.NODE_ENV === 'development';

// Rate-limit constants
const RATE_LIMIT_TOKENS = 30;
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds

// Payload cap (bytes)
const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS — defined once at module top level
// ─────────────────────────────────────────────────────────────────────────────

const schemas = {
  join_project: z.object({
    projectId: z.string().uuid(),
  }),

  send_message: z.object({
    projectId: z.string().uuid(),
    content: z.string().min(1).max(10000),
    msgType: z.enum(['text', 'file']).optional(),
    replyToId: z.string().uuid().optional().nullable(),
    fileUrl: z.string().url().optional().nullable(),
    fileName: z.string().max(255).optional().nullable(),
    fileSizeBytes: z.number().int().positive().optional().nullable(),
    mimeType: z.string().max(100).optional().nullable(),
  }),

  typing_start: z.object({
    projectId: z.string().uuid(),
  }),

  typing_stop: z.object({
    projectId: z.string().uuid(),
  }),

  mark_read: z.object({
    projectId: z.string().uuid(),
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function projectRoom(projectId) {
  return `project:${projectId}`;
}

/**
 * Validate event payload against its Zod schema.
 * On failure emits 'error' to the socket and returns false.
 * Returns the parsed (coerced) data on success.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} eventName
 * @param {unknown} data
 * @returns {{ ok: true, data: object } | { ok: false }}
 */
function validatePayload(socket, eventName, data) {
  const schema = schemas[eventName];
  if (!schema) return { ok: true, data };

  const result = schema.safeParse(data);
  if (!result.success) {
    socket.emit('error', {
      code: 'VALIDATION_ERROR',
      event: eventName,
      errors: result.error.flatten(),
    });
    return { ok: false };
  }
  return { ok: true, data: result.data };
}

/**
 * 32 KB manual payload guard.
 * Returns true (rejected) if oversized; emits error to socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {unknown} data
 * @returns {boolean}
 */
function isPayloadTooLarge(socket, data) {
  try {
    if (JSON.stringify(data).length > MAX_PAYLOAD_BYTES) {
      socket.emit('error', { code: 'PAYLOAD_TOO_LARGE' });
      return true;
    }
  } catch {
    // non-serialisable payload is treated as too-large
    socket.emit('error', { code: 'PAYLOAD_TOO_LARGE' });
    return true;
  }
  return false;
}

/**
 * Token-bucket rate limiter — synchronous except for the fire-and-forget audit write.
 * Returns true (rejected / caller must abort) if the socket is being disconnected for rate limit.
 *
 * Bucket stored as socket._rateBucket = { tokens: number, lastRefill: number }
 *
 * @param {import('socket.io').Socket} socket
 * @returns {boolean}
 */
function checkRateLimit(socket) {
  const now = Date.now();
  const bucket = socket._rateBucket;

  // Proportional refill: full refill (30 tokens) over 10 000 ms
  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_TOKENS;
  bucket.tokens = Math.min(RATE_LIMIT_TOKENS, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    // Fire-and-forget audit log — don't await in hot path
    authRepo.insertAuditLog({
      userId: socket.user?.id || null,
      eventType: 'socket_rate_limit_exceeded',
      outcome: 'blocked',
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || null,
      metadata: { socketId: socket.id },
    }).catch((err) => logger.warn({ err: err.message }, 'Failed to write rate-limit audit log'));

    socket.disconnect('rate_limit_exceeded');
    return true; // rejected
  }

  bucket.tokens -= 1;
  return false; // allowed
}

/**
 * Token-expiry check — must be called at the START of every event handler,
 * before the rate-limit check.
 * Returns true (rejected) if token has expired.
 *
 * @param {import('socket.io').Socket} socket
 * @returns {boolean}
 */
function isTokenExpired(socket) {
  if (socket.tokenExp && socket.tokenExp * 1000 <= Date.now()) {
    socket.emit('error', { code: 'TOKEN_EXPIRED' });
    socket.disconnect(true);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL IO REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

let _io = null;

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

async function initSocket(httpServer) {
  // ── Create Socket.IO server with 32 KB max buffer ──────────────────────────
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: MAX_PAYLOAD_BYTES,
  });

  // ── Redis adapter (optional) ───────────────────────────────────────────────
  if (env.REDIS_URL) {
    try {
      const pubClient = new Redis(env.REDIS_URL, { lazyConnect: true });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => logger.warn({ err: err.message }, 'Redis pub error'));
      subClient.on('error', (err) => logger.warn({ err: err.message }, 'Redis sub error'));

      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.io Redis adapter connected');
    } catch (err) {
      logger.warn({ err: err.message }, 'Socket.io Redis adapter unavailable, running single-process');
    }
  }

  // ── Authentication + origin middleware ─────────────────────────────────────
  io.use(async (socket, next) => {
    // 1. Origin allowlist gate — checked BEFORE token verification
    const origin = socket.handshake.headers.origin;
    if (!originMatcher.matches(origin, corsOrigins, { devLocalhost })) {
      const err = new Error('Authentication error');
      err.data = { code: 403 };
      return next(err);
    }

    // 2. Token verification
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const result = await authProvider.active.verifyAccessToken(token);
      socket.user = { id: result.userId, role: result.role };
      // Attach expiry so per-handler checks can gate on it
      socket.tokenExp = result.exp;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // Initialise per-socket token bucket
    socket._rateBucket = { tokens: RATE_LIMIT_TOKENS, lastRefill: Date.now() };

    // Join personal room for direct notifications
    socket.join(`user:${userId}`);

    // ── join_project ─────────────────────────────────────────────────────────
    socket.on('join_project', async (data) => {
      // 1. Token expiry
      if (isTokenExpired(socket)) return;
      // 2. Rate limit
      if (checkRateLimit(socket)) return;
      // 3. Payload size
      if (isPayloadTooLarge(socket, data)) return;
      // 4. Schema validation
      const validated = validatePayload(socket, 'join_project', data);
      if (!validated.ok) return;

      const { projectId } = validated.data;

      try {
        const project = await projectsRepo.findProjectById(projectId);
        if (!project) throw new Error('Project not found');
        if (project.client_id !== userId && project.freelancer_id !== userId) {
          socket.emit('error', { code: 'NOT_A_MEMBER', message: 'Not a project member' });
          return;
        }

        socket.join(projectRoom(projectId));
        socket.currentProjectId = projectId;
        socket.emit('joined_project', { projectId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── send_message ─────────────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      // 1. Token expiry
      if (isTokenExpired(socket)) return;
      // 2. Rate limit
      if (checkRateLimit(socket)) return;
      // 3. Payload size
      if (isPayloadTooLarge(socket, data)) return;
      // 4. Schema validation
      const validated = validatePayload(socket, 'send_message', data);
      if (!validated.ok) return;

      const safeData = validated.data;

      try {
        const message = await messagesService.sendMessage(userId, safeData.projectId, safeData);
        io.to(projectRoom(safeData.projectId)).emit('new_message', message);
      } catch (err) {
        socket.emit('message_error', { message: err.message });
      }
    });

    // ── typing_start ─────────────────────────────────────────────────────────
    socket.on('typing_start', (data) => {
      // 1. Token expiry
      if (isTokenExpired(socket)) return;
      // 2. Rate limit
      if (checkRateLimit(socket)) return;
      // 3. Payload size
      if (isPayloadTooLarge(socket, data)) return;
      // 4. Schema validation
      const validated = validatePayload(socket, 'typing_start', data);
      if (!validated.ok) return;

      const { projectId } = validated.data;
      socket.to(projectRoom(projectId)).emit('user_typing', { userId, projectId });
    });

    // ── typing_stop ──────────────────────────────────────────────────────────
    socket.on('typing_stop', (data) => {
      // 1. Token expiry
      if (isTokenExpired(socket)) return;
      // 2. Rate limit
      if (checkRateLimit(socket)) return;
      // 3. Payload size
      if (isPayloadTooLarge(socket, data)) return;
      // 4. Schema validation
      const validated = validatePayload(socket, 'typing_stop', data);
      if (!validated.ok) return;

      const { projectId } = validated.data;
      socket.to(projectRoom(projectId)).emit('user_stopped_typing', { userId, projectId });
    });

    // ── mark_read ─────────────────────────────────────────────────────────────
    socket.on('mark_read', async (data) => {
      // 1. Token expiry
      if (isTokenExpired(socket)) return;
      // 2. Rate limit
      if (checkRateLimit(socket)) return;
      // 3. Payload size
      if (isPayloadTooLarge(socket, data)) return;
      // 4. Schema validation
      const validated = validatePayload(socket, 'mark_read', data);
      if (!validated.ok) return;

      const { projectId } = validated.data;

      try {
        const markedIds = await messagesService.markRead(userId, projectId);
        if (markedIds.length > 0) {
          socket.to(projectRoom(projectId)).emit('messages_read', {
            userId,
            projectId,
            messageIds: markedIds,
          });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (socket.currentProjectId) {
        socket.to(projectRoom(socket.currentProjectId)).emit('user_stopped_typing', {
          userId,
          projectId: socket.currentProjectId,
        });
      }
      logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  _io = io;
  return io;
}

function getIo() {
  return _io;
}

module.exports = { initSocket, getIo };
