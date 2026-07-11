// src/utils/fileStorage.js
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

// ── Storage abstraction ──────────────────────────────────────
// This is local disk storage for development. In production you'd swap
// this file for one that uploads to S3/Cloudflare R2/etc. and returns a
// CDN URL instead. Every other file in this module only calls these two
// functions (saveBuffer, deleteFile) — so swapping storage backends
// later means touching ONE file, not every controller that uploads
// something. That's the same reasoning behind the repository pattern.

const UPLOAD_ROOT = path.join(process.cwd(), env.UPLOAD_DIR);

// ── Magic byte signatures ────────────────────────────────────
// A client can set the `Content-Type` / declared MIME type to anything
// it wants — Multer's fileFilter only sees what the browser CLAIMS the
// file is, not what it actually is. A renamed .exe can claim to be
// "image/png" and sail right past a mimetype-only check.
//
// Magic bytes are the first few bytes of a file's actual binary content,
// which file formats use to self-identify regardless of the filename or
// declared type. Checking these is real, defense-in-depth validation —
// not just trusting what the client says about itself.
const MAGIC_BYTES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // 'RIFF' header; WEBP marker follows at byte 8
};

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function bufferMatchesSignature(buffer, signature) {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

/**
 * Confirms the file's actual binary content matches one of the magic
 * byte signatures for its declared MIME type. Throws nothing — returns
 * a boolean so the caller decides how to respond.
 */
function isValidImageBuffer(buffer, declaredMimeType) {
  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return false;
  return signatures.some((sig) => bufferMatchesSignature(buffer, sig));
}

/**
 * Saves a validated buffer to disk under a randomly generated filename.
 * We NEVER use the client-supplied original filename for the path on
 * disk — that's how path traversal (`../../etc/passwd`) and overwrite
 * attacks happen. The original filename is kept only as display text in
 * the database, never as a filesystem path.
 */
async function saveBuffer(buffer, subdir, declaredMimeType) {
  const dir = path.join(UPLOAD_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });

  const extension = EXTENSION_BY_MIME[declaredMimeType];
  const filename = `${crypto.randomUUID()}${extension}`;
  const fullPath = path.join(dir, filename);

  await fs.writeFile(fullPath, buffer);

  const relativePath = path.join(subdir, filename);
  return {
    filename,
    relativePath, // stored in DB, e.g. "avatars/3f9a...c2.jpg"
    url: buildPublicUrl(relativePath),
  };
}

/** Builds the externally-reachable URL for a file we've stored. */
function buildPublicUrl(relativePath) {
  return `${env.PUBLIC_API_URL}/${env.UPLOAD_DIR}/${relativePath.replace(/\\/g, '/')}`;
}

/**
 * Deletes a previously stored file. Used when a user replaces their
 * avatar — without this, every re-upload leaves the old file orphaned
 * on disk forever. Failure here is logged but never thrown: a missing
 * old file should never block the new upload from succeeding.
 */
async function deleteFile(relativePath) {
  if (!relativePath) return;
  try {
    await fs.unlink(path.join(UPLOAD_ROOT, relativePath));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Could not delete old file ${relativePath}:`, err.message);
    }
  }
}

module.exports = { isValidImageBuffer, saveBuffer, deleteFile, buildPublicUrl };
