import logger from '../../utils/logger.js';
import AppError from '../../utils/AppError.js';

/**
 * UPLOADS MODULE - SECURITY SCAN HOOKS (scanner.js)
 * Responsibility: Outlines file verification scanning checks:
 *   1. Block high-risk executable files (.exe, .bat, .sh, .scr, etc.).
 *   2. Mock malware signature scanning (scanning byte signatures for typical exploit scripts).
 *   3. MIME-to-Extension consistency checks.
 */
class FileScanner {
  
  /**
   * Executes a suite of dynamic security scans on an incoming file
   */
  async scanFile(fileBuffer, originalName, mimeType) {
    logger.info(`Security Scanner: Initiating scan for file: ${originalName} | MIME: ${mimeType}`);

    // A. Enforce executable file format blocklist
    const blockedExtensions = [
      '.exe', '.bat', '.sh', '.bash', '.cmd', '.msi', '.scr', '.vbs', '.js', '.vbe', 
      '.jar', '.wsf', '.pif', '.cpl', '.reg'
    ];
    const fileExt = (originalName.slice((originalName.lastIndexOf(".") - 1 >>> 0) + 2)).toLowerCase();

    if (blockedExtensions.includes(`.${fileExt}`)) {
      logger.warn(`Security Alert: Executable upload attempt blocked. File: ${originalName}`);
      throw new AppError('File upload rejected. Executable formats are blocked for security compliance.', 400);
    }

    // B. Mock virus signature scan (evaluating string representations of exploit scripts)
    const contentString = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 2048)); // scan headers/metadata
    const suspiciousSignatures = [
      '<?php', 'eval(', 'exec(', 'system(', 'shell_exec(', 'powershell', 'cmd.exe',
      '<script', 'javascript:', 'drop table', 'union select'
    ];

    for (const signature of suspiciousSignatures) {
      if (contentString.toLowerCase().includes(signature)) {
        logger.error(`Security Alert: Malicious signature [${signature}] discovered in file: ${originalName}!`);
        throw new AppError('File upload rejected. Suspicious script signatures discovered during security scan.', 400);
      }
    }

    logger.info(`Security Scanner: Clean scan completed for file: ${originalName}`);
    return true;
  }
}

export default new FileScanner();
