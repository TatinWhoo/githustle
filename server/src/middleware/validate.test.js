'use strict';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// validate.js is CommonJS — use createRequire for ESM-style vitest
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const validate = require('./validate');
const { coerceInt, uuidParam, normalizeEmail, clampBodyLimit } = validate;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(overrides = {}) {
  return {
    requestId: 'test-req-id',
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    status(code) { this._status = code; return this; },
    json(body)   { this._json = body;   return this; },
  };
  return res;
}

// ─── coerceInt ────────────────────────────────────────────────────────────────

describe('coerceInt', () => {
  it('parses valid integer strings', () => {
    expect(coerceInt.parse('42')).toBe(42);
    expect(coerceInt.parse('-7')).toBe(-7);
    expect(coerceInt.parse('0')).toBe(0);
  });

  it('rejects decimals', () => {
    expect(() => coerceInt.parse('3.14')).toThrow();
  });

  it('rejects non-numeric strings', () => {
    expect(() => coerceInt.parse('abc')).toThrow();
    expect(() => coerceInt.parse('1e5')).toThrow();
  });
});

// ─── uuidParam ───────────────────────────────────────────────────────────────

describe('uuidParam', () => {
  it('accepts valid UUID', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(uuidParam.parse(id)).toBe(id);
  });

  it('rejects non-UUID', () => {
    expect(() => uuidParam.parse('not-a-uuid')).toThrow();
  });
});

// ─── normalizeEmail ───────────────────────────────────────────────────────────

describe('normalizeEmail', () => {
  it('lowercases', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('passes through non-strings unchanged', () => {
    expect(normalizeEmail(undefined)).toBe(undefined);
    expect(normalizeEmail(null)).toBe(null);
  });
});

// ─── clampBodyLimit ───────────────────────────────────────────────────────────

describe('clampBodyLimit', () => {
  let warnSpy;

  beforeEach(() => {
    // spy on the logger's warn method
    const logger = require('../config/logger');
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns limit unchanged when <= 100 KB', () => {
    expect(clampBodyLimit(50 * 1024)).toBe(50 * 1024);
    expect(clampBodyLimit(100 * 1024)).toBe(100 * 1024);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('clamps to 100 KB and logs warning when limit > 100 KB', () => {
    const result = clampBodyLimit(200 * 1024);
    expect(result).toBe(100 * 1024);
    expect(warnSpy).toHaveBeenCalledOnce();
    const [meta] = warnSpy.mock.calls[0];
    expect(meta).toMatchObject({ configuredLimit: 200 * 1024, effectiveLimit: 100 * 1024 });
  });
});

// ─── validate() middleware ────────────────────────────────────────────────────

describe('validate middleware', () => {
  it('passes when no schemas provided', () => {
    const mw = validate({});
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('validates body and calls next on success', () => {
    const mw = validate({ body: z.object({ name: z.string() }) });
    const req = makeReq({ body: { name: 'Alice' } });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: 'Alice' });
  });

  it('returns 422 VALIDATION_ERROR on body failure', () => {
    const mw = validate({ body: z.object({ age: z.number() }) });
    const req = makeReq({ body: { age: 'not-a-number' } });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(422);
    expect(res._json.code).toBe('VALIDATION_ERROR');
    expect(res._json.requestId).toBe('test-req-id');
    expect(res._json.errors).toBeDefined();
  });

  it('validates query and params', () => {
    const mw = validate({
      query: z.object({ page: z.string() }),
      params: z.object({ id: z.string().uuid() }),
    });
    const req = makeReq({
      query: { page: '1' },
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 415 when Content-Type not in allowedContentTypes', () => {
    const mw = validate({}, { allowedContentTypes: ['application/json'] });
    const req = makeReq({ headers: { 'content-type': 'text/plain' } });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res._status).toBe(415);
    expect(res._json.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(res._json.requestId).toBe('test-req-id');
  });

  it('passes when Content-Type matches allowedContentTypes (strips charset)', () => {
    const mw = validate({}, { allowedContentTypes: ['application/json'] });
    const req = makeReq({ headers: { 'content-type': 'application/json; charset=utf-8' } });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('normalizes email field to lowercase before validation', () => {
    const mw = validate({ body: z.object({ email: z.string().email() }) });
    const req = makeReq({ body: { email: 'User@Example.COM' } });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body.email).toBe('user@example.com');
  });

  it('backward compat: validate(schema) validates req.body', () => {
    const mw = validate(z.object({ x: z.number() }));
    const req = makeReq({ body: { x: 5 } });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ x: 5 });
  });

  it('backward compat: validate(schema, "query") validates req.query', () => {
    const mw = validate(z.object({ page: z.string() }), 'query');
    const req = makeReq({ query: { page: '2' } });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.query).toEqual({ page: '2' });
  });

  it('collects errors from multiple sources into single errors object', () => {
    const mw = validate({
      body:   z.object({ name: z.string().min(1) }),
      query:  z.object({ page: z.number() }),
    });
    const req = makeReq({ body: { name: '' }, query: { page: 'bad' } });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res._status).toBe(422);
    expect(res._json.errors).toBeDefined();
  });

  it('includes requestId in error response', () => {
    const mw = validate({ body: z.object({ x: z.number() }) });
    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res._json.requestId).toBe('test-req-id');
  });
});
