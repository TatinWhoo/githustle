'use strict';

const path = require('path');
const fs = require('fs');
const env = require('../config/env');

const SAFE_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

const MIME_MAP = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
};

/**
 * Safely serves files from the uploads directory.
 * Mounted at /uploads — req.path will be the portion after /uploads.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function staticUploads(req, res, next) {
  // Strip leading slash to get relative path
  const relPath = req.path.replace(/^\/+/, '');

  // Reject empty or directory-only paths
  if (!relPath || relPath === '.') {
    return res.status(404).end();
  }

  const absPath = path.resolve(SAFE_ROOT, relPath);

  // Path traversal guard: resolved path must stay inside SAFE_ROOT
  if (!absPath.startsWith(SAFE_ROOT + path.sep)) {
    return res.status(404).end();
  }

  // File existence check
  if (!fs.existsSync(absPath)) {
    return res.status(404).end();
  }

  const ext = path.extname(absPath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Disposition', 'inline');

  fs.createReadStream(absPath).pipe(res);
}

module.exports = staticUploads;
