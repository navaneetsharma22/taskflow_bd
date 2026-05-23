import multer from 'multer';
import AppError from '../../utils/AppError.js';

/**
 * UPLOADS MODULE - FILE VALIDATORS & MULTIPART MIDDLEWARE (validator.js)
 * Responsibility: Outlines multipart parameters whitelisting:
 *   1. Size validation caps (10 Megabytes maximum limits).
 *   2. Content MIME type whitelists (Images, PDFs, spreadsheets, CSV, ZIPs).
 *   3. In-memory buffer mapping to prevent disk leaks.
 */

// Whitelist of supportable MIME types
const whitelistMimeTypes = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed'
];

// Configure in-memory storage buffer
const storage = multer.memoryStorage();

// File filter validator execution
const fileFilter = (req, file, callback) => {
  if (whitelistMimeTypes.includes(file.mimetype.toLowerCase())) {
    callback(null, true);
  } else {
    callback(new AppError(`File type [${file.mimetype}] is not whitelisted for upload.`, 400), false);
  }
};

// Expose Multer middleware instance
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size ceiling
  },
});

export default uploadMiddleware;
