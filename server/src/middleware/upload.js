'use strict';

/**
 * upload.js — hardened file upload middleware
 *
 * Pipeline per upload request:
 *   multer memoryStorage (size + file-count limits)
 *   → MIME allowlist check (via multer fileFilter)
 *   → magic-byte verification  (magicBytes.verify)
 *   → malware scan              (scanBuffer hook)
 *   → safe subdir check         (pathValidator.isSafeSubdir)
 *   → UUID rename + write to disk
 *
 * Rejection priority (Requirement 9.10):
 *   MALWARE_DETECTED (422) > INVALID_FILE_CONTENT (422) > PAYLOAD_TOO_LARGE (413) > TOO_MANY_FILES (422)
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8, 9.9, 9.10
 */

const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { verify: verifyMagicBytes } = require('../security/magicBytes');
const { isSafeSubdir } = require('../security/pathValidator');
const { redact, SENSITIVE_KEYS } = require('../security/redact');
const env = require('../config/env');
const logger = require('../config/logger');
const { query } = require('../config/database');

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const UPLOAD_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

// ── Scan hook (default no-op) ─────────────────────────────────────────────────

/**
 * Pluggable AV scan hook.
 * Default returns { clean: true } and logs a warning that scanning is disabled.
 * Replace this export at deployment to point at ClamAV or equivalent.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<{ clean: boolean, reason?: string }>}
 */
async function scanBuffer(buffer, mimeType) {
  logger.warn({ mimeType, bytes: buffer.length }, 'upload: AV scanning disabled — no ClamAV configured');
  return { clean: true };
}

// ── Multer fileFilter — MIME allowlist ────────────────────────────────────────

/**
 * Multer fileFilter. Rejects files whose declared MIME is not in the allowlist.
 * Per-field file cap is enforced by the `files: 1` limit option on each upload.
 */
function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new AppError(
      `Only JPEG, PNG, and WEBP images are allowed. Got: ${file.mimetype}`,
      422,
      'UNSUPPORTED_MEDIA_TYPE',
    ));
  }
  cb(null, true);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Write the audit row for a malware detection event.
 * metadata.reason is redacted before insert per Requirement 9.9.
 *
 * @param {object} opts
 * @param {string|null} opts.actorUserId
 * @param {string}      opts.requestId
 * @param {string}      opts.ip
 * @param {string}      opts.userAgent
 * @param {string}      opts.reason
 */
async function writeMalwareAuditRow({ actorUserId, requestId, ip, userAgent, reason }) {
  const rawMeta = { reason };
  const safeMeta = redact(rawMeta, SENSITIVE_KEYS);
  try {
    await query(
      `INSERT INTO audit_logs
         (actor_user_id, event_type, outcome, request_id, ip, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5::inet, $6, $7)`,
      [
        actorUserId || null,
        'malware_detected',
        'failure',
        requestId,
        ip,
        (userAgent || '').slice(0, 512),
        JSON.stringify(safeMeta),
      ],
    );
  } catch (auditErr) {
    logger.error({ err: auditErr, requestId }, 'upload: failed to write malware_detected audit row');
  }
}

/**
 * Core upload processor. Called after multer has put the file in memory.
 * Runs magic-byte check → AV scan → writes to disk.
 *
 * @param {object} opts
 * @param {Express.Multer.File} opts.file     - multer file object (buffer in memory)
 * @param {string}              opts.subdir   - literal subdir name (e.g. 'avatars')
 * @param {object}              opts.req      - Express request (for requestId, user, ip, ua)
 * @returns {Promise<{ filename: string, relativePath: string, url: string }>}
 * @throws {AppError}
 */
async function processUpload({ file, subdir, req }) {
  // 1. Subdir safety gate (Requirement 9.6)
  if (!isSafeSubdir(subdir)) {
    throw new AppError(`Invalid upload subdirectory: "${subdir}"`, 500, 'INTERNAL_ERROR');
  }

  const requestId = req.id || (req.headers && req.headers['x-request-id']) || null;
  const actorUserId = req.user?.id || null;
  const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';
  const userAgent = req.headers?.['user-agent'] || '';

  const { buffer, mimetype: declaredMime } = file;

  // 2. Magic-byte verification — runs before any disk write (Requirement 9.2)
  const magicResult = verifyMagicBytes(buffer, declaredMime);
  // Note: handle AV first if AV is synchronous — but here both AV and magic
  // are async/sync. We follow rejection priority:
  //   MALWARE_DETECTED > INVALID_FILE_CONTENT
  // So run AV scan before we decide to throw on magic failure.

  // 3. AV scan (Requirement 9.8, 9.9)
  const scanResult = await scanBuffer(buffer, declaredMime);

  if (!scanResult.clean) {
    await writeMalwareAuditRow({
      actorUserId,
      requestId,
      ip,
      userAgent,
      reason: scanResult.reason || 'malware detected',
    });
    throw new AppError('File rejected: malware detected.', 422, 'MALWARE_DETECTED');
  }

  // 4. Magic-byte failure thrown after AV passes (priority: malware > content)
  if (!magicResult.ok) {
    throw new AppError(
      'File content does not match the declared type.',
      422,
      'INVALID_FILE_CONTENT',
    );
  }

  // 5. Build safe stored path — UUIDv4 + extension from verified MIME (Requirement 9.5)
  const ext = EXTENSION_BY_MIME[declaredMime];
  const filename = `${crypto.randomUUID()}${ext}`;
  const destDir = path.join(UPLOAD_ROOT, subdir);
  const fullPath = path.join(destDir, filename);

  await fs.mkdir(destDir, { recursive: true });
  await fs.writeFile(fullPath, buffer);

  const relativePath = `${subdir}/${filename}`;
  const url = `${env.PUBLIC_API_URL}/${env.UPLOAD_DIR}/${relativePath}`;

  return { filename, relativePath, url };
}

// ── Public factory ────────────────────────────────────────────────────────────

/**
 * Returns an array of two Express middleware functions:
 *   [0] multer — handles multipart parsing, file-count cap, size limit
 *   [1] processor — magic-byte check, AV scan, disk write
 *
 * Usage:
 *   router.post('/avatar', ...uploadImage('avatar', 'avatars'), controller.updateAvatar)
 *
 * The processor attaches `req.uploadedFile` with { filename, relativePath, url }.
 *
 * @param {string} fieldName        - multipart field name
 * @param {string} subdir           - literal subdir ('avatars' | 'portfolio')
 * @param {object} [opts]
 * @param {number} [opts.maxSizeBytes]  - per-route override; clamped to MAX_FILE_SIZE (Req 9.3)
 * @returns {Function[]}
 */
function uploadImage(fieldName, subdir, opts = {}) {
  const globalMax = env.MAX_FILE_SIZE; // bytes, from env (default 5 MB)
  const routeMax = opts.maxSizeBytes != null ? opts.maxSizeBytes : globalMax;
  const effectiveMax = Math.min(routeMax, globalMax);

  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: effectiveMax,   // per-file size cap (Requirement 9.3)
      files: 1,                 // per-request file cap (Requirement 9.4)
    },
  });

  // multer middleware — handles parse errors + converts multer errors to AppError
  const multerMiddleware = (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();

      // Size exceeded — multer emits this as LIMIT_FILE_SIZE
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(
          `File exceeds the maximum allowed size of ${Math.round(effectiveMax / 1024 / 1024)} MB.`,
          413,
          'PAYLOAD_TOO_LARGE',
        ));
      }

      // Too many files — multer emits LIMIT_FILE_COUNT or LIMIT_UNEXPECTED_FILE
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError(
          'Only one file per field is allowed.',
          422,
          'TOO_MANY_FILES',
        ));
      }

      // AppError from fileFilter (MIME mismatch) or any other multer error
      next(err);
    });
  };

  // Post-multer processor — magic bytes, AV scan, disk write
  const processorMiddleware = async (req, res, next) => {
    if (!req.file) {
      // No file uploaded — let the route decide if that's an error
      return next();
    }

    try {
      const result = await processUpload({ file: req.file, subdir, req });
      req.uploadedFile = result;
      next();
    } catch (err) {
      next(err);
    }
  };

  return [multerMiddleware, processorMiddleware];
}

/**
 * Convenience factory for portfolio images — uses PORTFOLIO_IMAGE_MAX_SIZE_MB.
 *
 * @param {string} fieldName
 * @returns {Function[]}
 */
function uploadPortfolioImage(fieldName) {
  const maxSizeBytes = env.PORTFOLIO_IMAGE_MAX_SIZE_MB * 1024 * 1024;
  return uploadImage(fieldName, 'portfolio', { maxSizeBytes });
}

module.exports = {
  uploadImage,
  uploadPortfolioImage,
  scanBuffer,        // exported so deployment can replace at runtime
  processUpload,     // exported for unit testing
  ALLOWED_MIME_TYPES,
};
