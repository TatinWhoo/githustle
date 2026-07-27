import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const protoPollutionGuard = require('./protoPollutionGuard');

function makeReq(body, requestId = 'req-123') {
  return { body, requestId };
}

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  return res;
}

describe('protoPollutionGuard', () => {
  it('calls next() for clean body', () => {
    const next = vi.fn();
    protoPollutionGuard(makeReq({ username: 'alice' }), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next() when body is undefined', () => {
    const next = vi.fn();
    protoPollutionGuard(makeReq(undefined), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next() for empty object', () => {
    const next = vi.fn();
    protoPollutionGuard(makeReq({}), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next() for array body with clean elements', () => {
    const next = vi.fn();
    protoPollutionGuard(makeReq([{ a: 1 }, { b: 2 }]), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('responds 400 for body with __proto__ own key', () => {
    const next = vi.fn();
    // Object.create(null) + defineProperty ensures __proto__ is a real own key
    const malicious = Object.create(null);
    Object.defineProperty(malicious, '__proto__', {
      value: {},
      enumerable: true,
      configurable: true,
    });
    const res = makeRes();
    protoPollutionGuard(makeReq(malicious, 'req-abc'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._body).toEqual({ status: 'error', code: 'INVALID_REQUEST', requestId: 'req-abc' });
  });

  it('responds 400 for body with constructor key', () => {
    const next = vi.fn();
    const body = { constructor: { prototype: {} } };
    const res = makeRes();
    protoPollutionGuard(makeReq(body, 'req-xyz'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._body).toEqual({ status: 'error', code: 'INVALID_REQUEST', requestId: 'req-xyz' });
  });

  it('responds 400 for body with prototype key', () => {
    const next = vi.fn();
    const body = { prototype: {} };
    const res = makeRes();
    protoPollutionGuard(makeReq(body), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });

  it('responds 400 for nested pollution key', () => {
    const next = vi.fn();
    const body = { user: { profile: { constructor: 'evil' } } };
    const res = makeRes();
    protoPollutionGuard(makeReq(body), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });

  it('includes req.requestId in 400 response', () => {
    const next = vi.fn();
    const body = { prototype: {} };
    const res = makeRes();
    protoPollutionGuard(makeReq(body, 'trace-999'), res, next);
    expect(res._body.requestId).toBe('trace-999');
  });

  it('does not call next() after 400 response', () => {
    const next = vi.fn();
    const body = { constructor: {} };
    protoPollutionGuard(makeReq(body), makeRes(), next);
    expect(next).not.toHaveBeenCalled();
  });
});
