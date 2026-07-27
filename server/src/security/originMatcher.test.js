import { describe, it, expect } from 'vitest';
import { matches } from './originMatcher.js';

const ALLOWLIST = ['https://app.example.com', 'https://admin.example.com'];

describe('matches — falsy origin', () => {
  it('returns false for undefined', () => expect(matches(undefined, ALLOWLIST)).toBe(false));
  it('returns false for null',      () => expect(matches(null,      ALLOWLIST)).toBe(false));
  it('returns false for empty string', () => expect(matches('', ALLOWLIST)).toBe(false));
});

describe('matches — exact match', () => {
  it('returns true when origin is in allowlist', () =>
    expect(matches('https://app.example.com', ALLOWLIST)).toBe(true));

  it('returns true for second entry in allowlist', () =>
    expect(matches('https://admin.example.com', ALLOWLIST)).toBe(true));

  it('returns false when origin not in allowlist', () =>
    expect(matches('https://evil.example.com', ALLOWLIST)).toBe(false));

  it('is case-sensitive — capital letter fails', () =>
    expect(matches('HTTPS://APP.EXAMPLE.COM', ALLOWLIST)).toBe(false));

  it('trailing slash is not the same as no trailing slash', () =>
    expect(matches('https://app.example.com/', ALLOWLIST)).toBe(false));
});

describe('matches — devLocalhost disabled (default)', () => {
  it('does not match localhost port when devLocalhost omitted', () =>
    expect(matches('http://localhost:3000', ['http://localhost:*'])).toBe(false));

  it('does not match localhost port when devLocalhost=false', () =>
    expect(matches('http://localhost:3000', ['http://localhost:*'], { devLocalhost: false })).toBe(false));
});

describe('matches — devLocalhost enabled', () => {
  const devList = [...ALLOWLIST, 'http://localhost:*'];

  it('matches http://localhost:<port> when shorthand present', () =>
    expect(matches('http://localhost:3000', devList, { devLocalhost: true })).toBe(true));

  it('matches a different port', () =>
    expect(matches('http://localhost:8080', devList, { devLocalhost: true })).toBe(true));

  it('does not match https://localhost:<port> (wrong scheme)', () =>
    expect(matches('https://localhost:3000', devList, { devLocalhost: true })).toBe(false));

  it('does not match http://localhost with no port', () =>
    expect(matches('http://localhost', devList, { devLocalhost: true })).toBe(false));

  it('does not match http://localhost:<port>/path (has path)', () =>
    expect(matches('http://localhost:3000/path', devList, { devLocalhost: true })).toBe(false));

  it('does not match when allowlist lacks the shorthand even with devLocalhost=true', () =>
    expect(matches('http://localhost:3000', ALLOWLIST, { devLocalhost: true })).toBe(false));

  it('still matches exact entries in the allowlist with devLocalhost=true', () =>
    expect(matches('https://app.example.com', devList, { devLocalhost: true })).toBe(true));
});

describe('matches — empty allowlist', () => {
  it('returns false for any origin', () =>
    expect(matches('https://app.example.com', [])).toBe(false));
});
