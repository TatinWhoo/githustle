// src/middleware/upload.js
const multer = require('multer');
const AppError = require('../utils/AppError');

// Memory storage, not disk storage. The file lands in req.file.buffer
// instead of being written straight to disk by Multer itself. This
// matters because it lets us run the magic-byte check (fileStorage.js)
// BEFORE anything touches the filesystem — Multer's own fileFilter only
// sees the declared mimetype, which a client can lie about.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    // Passing an error here makes Multer abort the upload immediately
    // instead of buffering a file we're going to reject anyway.
    return cb(new AppError('Only JPEG, PNG, and WEBP images are allowed.', 422));
  }
  cb(null, true);
}

/**
 * Returns Multer middleware configured for a single-file upload field.
 * `maxSizeMb` is enforced by Multer itself — oversized files are
 * rejected before fully buffering into memory, not after.
 */
function uploadSingleImage(fieldName, maxSizeMb) {
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 1 },
  }).single(fieldName);
}

module.exports = { uploadSingleImage };
