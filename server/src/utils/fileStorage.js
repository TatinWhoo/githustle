// src/utils/fileStorage.js
// Local disk storage for development.
// Swap this file for an S3/Cloudflare R2 implementation in production —
// every other file only calls saveBuffer() and deleteFile(), so
// the swap touches one file only.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

const UPLOAD_ROOT = path.join(process.cwd(), env.UPLOAD_DIR);

// Magic byte signatures — validates actual file content, not just the
// declared mimetype a client can lie about.
const MAGIC_BYTES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png':  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
};

function bufferMatchesSignature(buffer, signature) {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

function isValidImageBuffer(buffer, declaredMimeType) {
  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return false;
  return signatures.some((sig) => bufferMatchesSignature(buffer, sig));
}

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
    relativePath,
    url: buildPublicUrl(relativePath),
  };
}

function buildPublicUrl(relativePath) {
  return `${env.PUBLIC_API_URL}/${env.UPLOAD_DIR}/${relativePath.replace(/\\/g, '/')}`;
}

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
