'use strict';

/**
 * Magic-byte verifier for uploaded images.
 *
 * verify(buffer, declaredMime) -> { ok: true } | { ok: false, actualMime: string|null }
 *
 * Supported types:
 *   image/jpeg  - FF D8 FF at offset 0 (3 bytes)
 *   image/png   - 89 50 4E 47 0D 0A 1A 0A at offset 0 (8 bytes)
 *   image/webp  - RIFF (bytes 0-3) + WEBP (bytes 8-11); bytes 4-7 are file size, skipped
 *
 * Requirements: 9.2
 */

const SIGNATURES = {
  'image/jpeg': {
    minLength: 3,
    /**
     * @param {Buffer} buf
     * @returns {boolean}
     */
    matches(buf) {
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    },
  },
  'image/png': {
    minLength: 8,
    /**
     * @param {Buffer} buf
     * @returns {boolean}
     */
    matches(buf) {
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 && // P
        buf[2] === 0x4e && // N
        buf[3] === 0x47 && // G
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      );
    },
  },
  'image/webp': {
    minLength: 12,
    /**
     * @param {Buffer} buf
     * @returns {boolean}
     */
    matches(buf) {
      // bytes 0-3: RIFF (52 49 46 46)
      // bytes 4-7: file size (variable, skipped)
      // bytes 8-11: WEBP (57 45 42 50)
      return (
        buf[0] === 0x52 && // R
        buf[1] === 0x49 && // I
        buf[2] === 0x46 && // F
        buf[3] === 0x46 && // F
        buf[8] === 0x57 && // W
        buf[9] === 0x45 && // E
        buf[10] === 0x42 && // B
        buf[11] === 0x50    // P
      );
    },
  },
};

/**
 * Detect the actual MIME type from a buffer's magic bytes.
 * Returns the matching MIME string or null if unrecognised.
 *
 * @param {Buffer} buf
 * @returns {string|null}
 */
function detectMime(buf) {
  for (const [mime, sig] of Object.entries(SIGNATURES)) {
    if (buf.length >= sig.minLength && sig.matches(buf)) {
      return mime;
    }
  }
  return null;
}

/**
 * Verify that `buffer` actually contains the image format declared by `declaredMime`.
 *
 * @param {Buffer} buffer   - Node.js Buffer with the file's raw bytes
 * @param {string} declaredMime - MIME type claimed by the uploader (compared case-insensitively)
 * @returns {{ ok: true } | { ok: false, actualMime: string|null }}
 */
function verify(buffer, declaredMime) {
  const normalized = (declaredMime || '').toLowerCase().trim();

  // Reject unsupported declared types immediately
  if (!SIGNATURES[normalized]) {
    return { ok: false, actualMime: null };
  }

  const sig = SIGNATURES[normalized];

  // Buffer too short to contain this signature
  if (!buffer || buffer.length < sig.minLength) {
    return { ok: false, actualMime: null };
  }

  if (sig.matches(buffer)) {
    return { ok: true };
  }

  // Bytes don't match declared type — detect what it actually is
  return { ok: false, actualMime: detectMime(buffer) };
}

module.exports = { verify, SIGNATURES };
