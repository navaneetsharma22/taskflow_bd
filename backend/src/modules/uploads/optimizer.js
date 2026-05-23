import sharp from 'sharp';
import logger from '../../utils/logger.js';

/**
 * UPLOADS MODULE - IMAGE OPTIMIZER SERVICE (optimizer.js)
 * Responsibility: Outlines sharp image compressors and converters:
 *   1. Automatic resize matching sensible width boundaries (e.g. Max 1200px width).
 *   2. Forced conversion into modern web-optimized 'WebP' file formats.
 *   3. Intelligent quality adjustments (Quality 80) to maximize space savings.
 */
class ImageOptimizer {

  /**
   * Optimizes an image file buffer, returning the compressed WebP buffer.
   */
  async optimizeImage(fileBuffer, originalName) {
    try {
      logger.info(`Image Optimizer: Optimizing image [${originalName}] using sharp.`);

      const processor = sharp(fileBuffer);
      const metadata = await processor.metadata();

      // Enforce maximum width boundaries, resizing relative to aspect ratios
      const maxWidth = 1200;
      if (metadata.width && metadata.width > maxWidth) {
        processor.resize({ width: maxWidth, withoutEnlargement: true });
        logger.debug(`Image Optimizer: Resized image width down to ${maxWidth}px.`);
      }

      // Convert to WebP format with intelligent compression
      const optimizedBuffer = await processor
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      logger.info(`Image Optimizer: Image optimization completed. Size reduction: ${Math.round(((fileBuffer.length - optimizedBuffer.length) / fileBuffer.length) * 100)}%`);

      return {
        buffer: optimizedBuffer,
        fileName: `${originalName.substring(0, originalName.lastIndexOf('.')) || originalName}.webp`,
        mimeType: 'image/webp',
      };
    } catch (err) {
      // In case image processing fails (e.g. corrupted file structure), fallback gracefully
      logger.error(`Image Optimizer: Optimization failed. Error: ${err.message}. Falling back to original buffer.`);
      return null;
    }
  }

  /**
   * Inspects MIME type to check if it represents a supportable image format
   */
  isImage(mimeType) {
    const supportableImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/gif'];
    return supportableImageTypes.includes(mimeType.toLowerCase());
  }
}

export default new ImageOptimizer();
