'use strict';

// src/middleware/validate.js
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 8.9

const logger = require('../config/logger');

// ─── Body-size clamp ─────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 100 * 1024; // 100 KB hard ceiling

/**
 * Returns the effective body-size limit clamped to 100 KB.
 * Logs a boot-time warning when configuredLimit > 100 KB (Requirement 8.3).
 *
 * @param {number} configuredLimit - Desired body size limit in bytes.
 * @returns {number}
 */
function clampBodyLimit(configuredLimit) {
  if (configuredLimit > MAX_BODY_BYTES) {
    logger.warn(
      { configuredLimit, effectiveLimit: MAX_BODY_BYTES },
      'body-size limit clamped to 100 KB'
    );
    return MAX_BODY_BYTES;
  }
  return configuredLimit;
}

// ─── Content-Type allowlist middleware factory ────────────────────────────────

/**
 * Standalone middleware factory that rejects requests whose Content-Type
 * does not appear in `types` with HTTP 415 UNSUPPORTED_MEDIA_TYPE
 * (Requirement 8.4).
 *
 * @param {string[]} types - Allowed MIME types, e.g. ['application/json']
 * @returns {import('express').RequestHandler}
 */
function contentTypeAllowlist(types) {
  const allowed = (types || []).map((t) => t.toLowerCase());
  return (req, res, next) => {
    if (!allowed.length) return next();
    const rawCT = req.headers['content-type'] || '';
    // Strip charset suffix (e.g. "; charset=utf-8") before comparison
    const ct = rawCT.split(';')[0].trim().toLowerCase();
    if (!allowed.includes(ct)) {
      return res.status(415).json({
        status: 'error',
        code: 'UNSUPPORTED_MEDIA_TYPE',
        requestId: req.requestId,
      });
    }
    next();
  };
}

// ─── Main validate middleware factory ────────────────────────────────────────

/**
 * Dual-signature middleware factory.
 *
 * **New (schema map) form:**
 *   validate({ body?, query?, params? }, options?)
 *   where options = { allowedContentTypes?: string[] }
 *
 * **Legacy (positional) form — backward compat with existing routes:**
 *   validate(schema, source = 'body')
 *   where source is 'body' | 'query' | 'params'
 *   OR validate(schema) → validates req.body
 *
 * Requirements: 8.1, 8.2, 8.4, 8.7, 8.8, 8.9
 *
 * @param {import('zod').ZodTypeAny | { body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemaOrMap
 * @param {string | { allowedContentTypes?: string[] }} [sourceOrOptions]
 * @returns {import('express').RequestHandler}
 */
function validate(schemaOrMap, sourceOrOptions) {
  // ── Detect call signature ─────────────────────────────────────────────────
  let bodySchema, querySchema, paramsSchema, allowedContentTypes;

  const isZodSchema =
    schemaOrMap != null &&
    typeof schemaOrMap === 'object' &&
    typeof schemaOrMap.safeParse === 'function';

  if (isZodSchema) {
    // Legacy form: validate(zodSchema, source='body')
    const source = typeof sourceOrOptions === 'string' ? sourceOrOptions : 'body';
    if (source === 'body')        bodySchema   = schemaOrMap;
    else if (source === 'query')  querySchema  = schemaOrMap;
    else if (source === 'params') paramsSchema = schemaOrMap;
    else                          bodySchema   = schemaOrMap; // fallback
  } else {
    // Schema-map form: validate({ body, query, params }, options?)
    const map  = schemaOrMap || {};
    bodySchema   = map.body;
    querySchema  = map.query;
    paramsSchema = map.params;

    const opts = (typeof sourceOrOptions === 'object' && sourceOrOptions !== null)
      ? sourceOrOptions
      : {};
    allowedContentTypes = opts.allowedContentTypes;
  }

  return (req, res, next) => {
    const requestId = req.requestId;

    // ── 1. Content-Type allowlist (Requirement 8.4) ───────────────────────
    if (allowedContentTypes && allowedContentTypes.length > 0) {
      const rawCT = req.headers['content-type'] || '';
      // Strip charset suffix before comparison
      const ct = rawCT.split(';')[0].trim().toLowerCase();
      const allowed = allowedContentTypes.map((t) => t.toLowerCase());
      if (!allowed.includes(ct)) {
        return res.status(415).json({
          status: 'error',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          requestId,
        });
      }
    }

    // ── 2. Email normalization on req.body (Requirement 8.7) ─────────────
    // Lowercase-normalize any field named `email` in req.body before Zod parse
    if (bodySchema && req.body && typeof req.body === 'object' && typeof req.body.email === 'string') {
      req.body = { ...req.body, email: req.body.email.toLowerCase() };
    }

    // ── 3. Zod validation across all declared sources (Requirements 8.1, 8.2, 8.8, 8.9) ──
    const errors = {};

    const sources = [
      { schema: bodySchema,   source: 'body'   },
      { schema: querySchema,  source: 'query'  },
      { schema: paramsSchema, source: 'params' },
    ];

    for (const { schema, source } of sources) {
      if (!schema) continue;
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        // Collect field-level errors
        const fieldErrors = result.error.flatten().fieldErrors;
        for (const [field, messages] of Object.entries(fieldErrors)) {
          errors[field] = errors[field] ? [...errors[field], ...messages] : messages;
        }
        // Collect root-level / form errors under `_<source>` key
        const formErrors = result.error.flatten().formErrors;
        if (formErrors.length > 0) {
          const key = `_${source}`;
          errors[key] = errors[key] ? [...errors[key], ...formErrors] : formErrors;
        }
      } else {
        // Replace req[source] with coerced/transformed Zod output
        req[source] = result.data;
      }
    }

    // ── 4. Failure response (Requirement 8.2) ────────────────────────────
    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        errors,
        requestId,
      });
    }

    next();
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = validate;
module.exports.clampBodyLimit        = clampBodyLimit;
module.exports.contentTypeAllowlist  = contentTypeAllowlist;

// Zod helpers — re-exported so callers don't need a direct zod dependency
// for the standard patterns validated by this middleware.
const { z } = require('zod');

/**
 * Coerces a string matching /^-?\d+$/ to an integer.
 * Rejects decimals, scientific notation, and non-numeric characters (Req 8.8).
 */
const coerceInt = z
  .string()
  .regex(/^-?\d+$/, 'Must be an integer string')
  .transform(Number)
  .pipe(z.number().int());

/** UUID path/query parameter (Requirement 8.9). */
const uuidParam = z.string().uuid();

/**
 * Lowercases a string — used to normalise email fields before Zod parse.
 * @param {string|unknown} str
 * @returns {string|unknown}
 */
function normalizeEmail(str) {
  return typeof str === 'string' ? str.toLowerCase() : str;
}

module.exports.coerceInt      = coerceInt;
module.exports.uuidParam      = uuidParam;
module.exports.normalizeEmail = normalizeEmail;
