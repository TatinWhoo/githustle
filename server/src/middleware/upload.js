// src/middleware/upload.js
const multer = require('multer');
const AppError = require('../utils/AppError');

// Memory storage — file lands in req.file.buffer, not on disk yet.
// This lets us run magic-byte validation before anything touches the filesystem.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new AppError('Only JPEG, PNG, and WEBP images are allowed.', 422));
  }
  cb(null, true);
}

function uploadSingleImage(fieldName, maxSizeMb) {
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 1 },
  }).single(fieldName);
}

module.exports = { uploadSingleImage };
