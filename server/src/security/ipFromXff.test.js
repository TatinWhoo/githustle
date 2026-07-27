/**
 * Unit tests for ipFromXff.clientIp
 * Requirements: 3.7, 7.11
 */

import { describe, it, expect } from 'vitest';
import { clientIp } from './ipFromXff.js';

// Helper to build minimal request-like objects
function makeReq({ xff, socketIp = '10.0.0.99' } = {}) {
  return {
    headers: xff !== undefined ? { 'x-forwarded-for': xff } : {},
    socket: { remoteAddress: socketIp },
  };
}

describe('clientIp – depth === 0 (XFF ignored)', () => {
  it('returns socket IP when depth is 0, even if XFF is present', () => {
    const req = makeReq({ xff: '1.2.3.4, 5.6.7.8', socketIp: '192.168.1.1' });
    expect(clientIp(req, 0)).toBe('192.168.1.1');
  });

  it('returns socket IP when depth is 0 and XFF is absent', () => {
    const req = makeReq({ socketIp: '192.168.1.1' });
    expect(clientIp(req, 0)).toBe('192.168.1.1');
  });

  it('returns empty string when depth is 0 and no socket address', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, socket: { remoteAddress: '' } };
    expect(clientIp(req, 0)).toBe('');
  });
});

describe('clientIp – missing XFF header', () => {
  it('falls back to socket IP when XFF header is absent', () => {
    const req = makeReq({ socketIp: '172.16.0.5' });
    expect(clientIp(req, 1)).toBe('172.16.0.5');
  });

  it('falls back to socket IP when XFF header is empty string', () => {
    const req = makeReq({ xff: '', socketIp: '172.16.0.5' });
    expect(clientIp(req, 1)).toBe('172.16.0.5');
  });

  it('falls back to socket IP when XFF header is whitespace only', () => {
    const req = makeReq({ xff: '   ', socketIp: '172.16.0.5' });
    expect(clientIp(req, 1)).toBe('172.16.0.5');
  });
});

describe('clientIp – single proxy (depth === 1)', () => {
  it('picks the client IP to the left of the single trusted proxy', () => {
    // XFF: client → proxy  (proxy added 10.0.0.1, so XFF = "1.2.3.4, 10.0.0.1")
    const req = makeReq({ xff: '1.2.3.4, 10.0.0.1', socketIp: '10.0.0.1' });
    expect(clientIp(req, 1)).toBe('1.2.3.4');
  });

  it('picks the only hop when only one entry and depth is 1', () => {
    // Only one hop means it is the client (depth clamped)
    const req = makeReq({ xff: '1.2.3.4', socketIp: '10.0.0.1' });
    expect(clientIp(req, 1)).toBe('1.2.3.4');
  });

  it('handles extra whitespace around hops', () => {
    const req = makeReq({ xff: '  1.2.3.4 ,  10.0.0.1  ', socketIp: '10.0.0.1' });
    expect(clientIp(req, 1)).toBe('1.2.3.4');
  });
});

describe('clientIp – two proxies (depth === 2)', () => {
  it('skips both trusted proxies to reach the real client', () => {
    // XFF: "1.2.3.4, 10.0.0.1, 172.16.0.1"  depth=2
    // trusted proxies are the last 2: 10.0.0.1 and 172.16.0.1
    // client is at index max(0, 3-1-2)=0
    const req = makeReq({ xff: '1.2.3.4, 10.0.0.1, 172.16.0.1', socketIp: '172.16.0.1' });
    expect(clientIp(req, 2)).toBe('1.2.3.4');
  });

  it('clamps to index 0 when XFF has fewer hops than depth', () => {
    // Only one hop, depth=2 → idx = max(0, 1-1-2)=0
    const req = makeReq({ xff: '5.5.5.5', socketIp: '10.0.0.1' });
    expect(clientIp(req, 2)).toBe('5.5.5.5');
  });
});

describe('clientIp – depth === 3 and longer chains', () => {
  it('correctly walks back 3 proxies', () => {
    // XFF: "client, p1, p2, p3" depth=3 → idx = max(0, 4-1-3)=0 → client
    const req = makeReq({ xff: '9.9.9.9, 10.0.0.1, 10.0.0.2, 10.0.0.3', socketIp: '10.0.0.3' });
    expect(clientIp(req, 3)).toBe('9.9.9.9');
  });
});

describe('clientIp – fallback chain: socket vs connection', () => {
  it('falls back to req.connection.remoteAddress when req.socket is absent', () => {
    const req = {
      headers: {},
      connection: { remoteAddress: '192.0.2.1' },
    };
    expect(clientIp(req, 1)).toBe('192.0.2.1');
  });

  it('prefers req.socket.remoteAddress over req.connection.remoteAddress', () => {
    const req = {
      headers: { 'x-forwarded-for': '' },
      socket: { remoteAddress: '192.0.2.2' },
      connection: { remoteAddress: '192.0.2.3' },
    };
    expect(clientIp(req, 1)).toBe('192.0.2.2');
  });
});

describe('clientIp – malformed / edge-case XFF values', () => {
  it('ignores empty comma-separated entries', () => {
    // "1.2.3.4,,10.0.0.1" → after filter ["1.2.3.4","10.0.0.1"], depth=1 → "1.2.3.4"
    const req = makeReq({ xff: '1.2.3.4,,10.0.0.1', socketIp: '10.0.0.1' });
    expect(clientIp(req, 1)).toBe('1.2.3.4');
  });

  it('treats a single valid IP as the client even with depth > hops', () => {
    const req = makeReq({ xff: '203.0.113.5', socketIp: '10.0.0.1' });
    expect(clientIp(req, 5)).toBe('203.0.113.5');
  });
});
