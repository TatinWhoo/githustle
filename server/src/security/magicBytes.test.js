import { describe, it, expect } from 'vitest';
import { verify } from './magicBytes.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function jpegBuffer(extra = 0) {
  const b = Buffer.alloc(3 + extra, 0x00);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff;
  return b;
}

function pngBuffer(extra = 0) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const b = Buffer.alloc(8 + extra, 0x00);
  sig.forEach((byte, i) => { b[i] = byte; });
  return b;
}

function webpBuffer(extra = 0) {
  // RIFF....WEBP
  const b = Buffer.alloc(12 + extra, 0x00);
  // RIFF
  b[0] = 0x52; b[1] = 0x49; b[2] = 0x46; b[3] = 0x46;
  // bytes 4-7: file size (arbitrary)
  b[4] = 0x24; b[5] = 0x10; b[6] = 0x00; b[7] = 0x00;
  // WEBP
  b[8] = 0x57; b[9] = 0x45; b[10] = 0x42; b[11] = 0x50;
  return b;
}

// ── image/jpeg ────────────────────────────────────────────────────────────────

describe('verify – image/jpeg', () => {
  it('returns ok:true for matching JPEG bytes', () => {
    expect(verify(jpegBuffer(), 'image/jpeg')).toEqual({ ok: true });
  });

  it('accepts case-insensitive declaredMime IMAGE/JPEG', () => {
    expect(verify(jpegBuffer(), 'IMAGE/JPEG')).toEqual({ ok: true });
  });

  it('accepts mixed-case Image/Jpeg', () => {
    expect(verify(jpegBuffer(), 'Image/Jpeg')).toEqual({ ok: true });
  });

  it('returns ok:false when bytes are PNG but declared as jpeg', () => {
    const result = verify(pngBuffer(), 'image/jpeg');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe('image/png');
  });

  it('returns ok:false, actualMime:null for random bytes declared as jpeg', () => {
    const buf = Buffer.from([0x00, 0x11, 0x22]);
    const result = verify(buf, 'image/jpeg');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });

  it('returns ok:false when buffer is too short (2 bytes)', () => {
    const result = verify(Buffer.from([0xff, 0xd8]), 'image/jpeg');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });

  it('returns ok:false for empty buffer', () => {
    const result = verify(Buffer.alloc(0), 'image/jpeg');
    expect(result.ok).toBe(false);
  });
});

// ── image/png ─────────────────────────────────────────────────────────────────

describe('verify – image/png', () => {
  it('returns ok:true for matching PNG bytes', () => {
    expect(verify(pngBuffer(), 'image/png')).toEqual({ ok: true });
  });

  it('accepts case-insensitive IMAGE/PNG', () => {
    expect(verify(pngBuffer(), 'IMAGE/PNG')).toEqual({ ok: true });
  });

  it('returns ok:false when bytes are JPEG but declared as png', () => {
    const result = verify(jpegBuffer(5), 'image/png');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe('image/jpeg');
  });

  it('returns ok:false when buffer is 7 bytes (one short of PNG signature)', () => {
    const result = verify(pngBuffer().subarray(0, 7), 'image/png');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });

  it('returns ok:false for empty buffer', () => {
    expect(verify(Buffer.alloc(0), 'image/png').ok).toBe(false);
  });
});

// ── image/webp ────────────────────────────────────────────────────────────────

describe('verify – image/webp', () => {
  it('returns ok:true for matching WEBP bytes', () => {
    expect(verify(webpBuffer(), 'image/webp')).toEqual({ ok: true });
  });

  it('ignores variable bytes 4-7 (file size field)', () => {
    const b = webpBuffer();
    // Change file-size bytes to any value
    b[4] = 0xaa; b[5] = 0xbb; b[6] = 0xcc; b[7] = 0xdd;
    expect(verify(b, 'image/webp')).toEqual({ ok: true });
  });

  it('accepts case-insensitive IMAGE/WEBP', () => {
    expect(verify(webpBuffer(), 'IMAGE/WEBP')).toEqual({ ok: true });
  });

  it('returns ok:false when RIFF marker is wrong', () => {
    const b = webpBuffer();
    b[0] = 0x00;
    const result = verify(b, 'image/webp');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when WEBP marker is wrong', () => {
    const b = webpBuffer();
    b[8] = 0x00;
    const result = verify(b, 'image/webp');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when declared as webp but bytes are JPEG', () => {
    const result = verify(jpegBuffer(9), 'image/webp');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe('image/jpeg');
  });

  it('returns ok:false when buffer is 11 bytes (one short of WEBP signature)', () => {
    const result = verify(webpBuffer().subarray(0, 11), 'image/webp');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for empty buffer', () => {
    expect(verify(Buffer.alloc(0), 'image/webp').ok).toBe(false);
  });
});

// ── unsupported / edge cases ──────────────────────────────────────────────────

describe('verify – unsupported or invalid declaredMime', () => {
  it('returns ok:false, actualMime:null for unsupported type image/gif', () => {
    const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const result = verify(gifHeader, 'image/gif');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });

  it('returns ok:false, actualMime:null for empty declaredMime', () => {
    const result = verify(jpegBuffer(), '');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });

  it('returns ok:false, actualMime:null for null declaredMime', () => {
    const result = verify(jpegBuffer(), null);
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });

  it('returns ok:false, actualMime:null for undefined declaredMime', () => {
    const result = verify(jpegBuffer(), undefined);
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });

  it('returns ok:false, actualMime:null for application/octet-stream', () => {
    const result = verify(jpegBuffer(), 'application/octet-stream');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });

  it('returns ok:false, actualMime:null for null buffer', () => {
    const result = verify(null, 'image/jpeg');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe(null);
  });
});

// ── actualMime detection cross-checks ────────────────────────────────────────

describe('verify – actualMime cross-detection', () => {
  it('detects jpeg when declared png but buffer is jpeg', () => {
    const result = verify(jpegBuffer(8), 'image/png');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe('image/jpeg');
  });

  it('detects webp when declared jpeg but buffer is webp', () => {
    const result = verify(webpBuffer(), 'image/jpeg');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe('image/webp');
  });

  it('detects png when declared webp but buffer is png', () => {
    const result = verify(pngBuffer(4), 'image/webp');
    expect(result.ok).toBe(false);
    expect(result.actualMime).toBe('image/png');
  });
});
