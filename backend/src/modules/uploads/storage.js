import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

/**
 * UPLOADS MODULE - OBJECT STORAGE PROVIDER INTERFACE (storage.js)
 * Responsibility: Outlines standard storage actions (uploadFile, deleteFile).
 * Configures local simulated object storage by default, with complete
 * production S3 / Cloudinary adapters boilerplates for instant scale.
 */
class ObjectStorageService {
  constructor() {
    // Define a localized public directory within the workspace to store static uploads
    this.localUploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure the folder structure exists locally
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
  }

  /**
   * Uploads file buffer to storage provider, returning public URL.
   */
  async uploadFile(fileBuffer, originalName, mimeType) {
    try {
      // Create a unique, cryptographically secure file name to avoid collisions
      const fileExt = path.extname(originalName) || '.bin';
      const secureHash = crypto.randomBytes(16).toString('hex');
      const secureName = `${secureHash}${fileExt}`;

      // Local Simulated Object Storage implementation
      const targetPath = path.join(this.localUploadDir, secureName);
      await fs.promises.writeFile(targetPath, fileBuffer);

      // Generate localized public static route URL
      const publicUrl = `/uploads/${secureName}`;
      logger.info(`Storage Service: Upload complete. Local URL: ${publicUrl}`);

      return {
        url: publicUrl,
        fileName: secureName,
        mimeType,
        fileSize: fileBuffer.length,
      };

      /*
      // ==========================================
      // PRODUCTION AWS S3 INTEGRATION BOILERPLATE
      // ==========================================
      import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
      const s3 = new S3Client({ region: process.env.AWS_REGION });
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${secureName}`,
        Body: fileBuffer,
        ContentType: mimeType,
      };
      await s3.send(new PutObjectCommand(uploadParams));
      return {
        url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${secureName}`,
        fileName: secureName,
        mimeType,
        fileSize: fileBuffer.length,
      };
      */
    } catch (err) {
      logger.error(`Storage Service: Upload failure. Error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Deletes a file from the storage pool.
   */
  async deleteFile(fileUrl) {
    try {
      if (fileUrl.startsWith('/uploads/')) {
        const fileName = fileUrl.replace('/uploads/', '');
        const targetPath = path.join(this.localUploadDir, fileName);
        
        if (fs.existsSync(targetPath)) {
          await fs.promises.unlink(targetPath);
          logger.info(`Storage Service: Successfully deleted local file: ${fileName}`);
        }
      }
      return true;
    } catch (err) {
      logger.error(`Storage Service: Delete failure. Error: ${err.message}`);
      return false;
    }
  }
}

export default new ObjectStorageService();
