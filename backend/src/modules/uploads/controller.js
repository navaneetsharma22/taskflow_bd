import objectStorageService from './storage.js';
import fileScanner from './scanner.js';
import imageOptimizer from './optimizer.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHelper.js';
import AppError from '../../utils/AppError.js';

/**
 * UPLOADS MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for multipart file uploads,
 * executing file validation checks, scan hooks, image optimizations,
 * and storage provider uploading workflows.
 */

/**
 * @desc    Upload a single file, applying scanners and image optimization
 * @route   POST /api/uploads/single
 * @access  Private (Authenticated users only)
 */
export const uploadSingleFile = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    throw new AppError('No file uploaded. Please attach a file under the "file" field.', 400);
  }

  // 1. Execute Security Scan Hooks
  await fileScanner.scanFile(file.buffer, file.originalname, file.mimetype);

  let targetBuffer = file.buffer;
  let targetName = file.originalname;
  let targetMimeType = file.mimetype;

  // 2. Apply Image Optimization if applicable
  if (imageOptimizer.isImage(file.mimetype)) {
    const optimized = await imageOptimizer.optimizeImage(file.buffer, file.originalname);
    if (optimized) {
      targetBuffer = optimized.buffer;
      targetName = optimized.fileName;
      targetMimeType = optimized.mimeType;
    }
  }

  // 3. Upload to Object Storage pool
  const uploadResult = await objectStorageService.uploadFile(targetBuffer, targetName, targetMimeType);

  return successResponse(res, 'File uploaded and optimized successfully.', uploadResult, 201);
});
