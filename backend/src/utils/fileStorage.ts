import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface FileStorageConfig {
  uploadDir: string;
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export interface StoredFile {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  hash: string;
}

export class FileStorage {
  private config: FileStorageConfig;

  constructor(config: FileStorageConfig) {
    this.config = config;
    this.ensureUploadDirectory();
  }

  /**
   * Ensure the upload directory exists
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.config.uploadDir)) {
      fs.mkdirSync(this.config.uploadDir, { recursive: true });
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(file: Express.Multer.File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
      };
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `File type ${file.mimetype} is not allowed`
      };
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `File extension ${extension} is not allowed`
      };
    }

    return { isValid: true };
  }

  /**
   * Generate a secure filename
   */
  private generateSecureFilename(originalName: string): string {
    const extension = path.extname(originalName);
    const uuid = uuidv4();
    return `${uuid}${extension}`;
  }

  /**
   * Calculate file hash for integrity checking
   */
  private calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Store uploaded file securely
   */
  async storeFile(file: Express.Multer.File): Promise<StoredFile> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Generate secure filename
    const secureFilename = this.generateSecureFilename(file.originalname);
    const filePath = path.join(this.config.uploadDir, secureFilename);

    // Move file to secure location
    fs.writeFileSync(filePath, file.buffer);

    // Calculate file hash
    const hash = this.calculateFileHash(filePath);

    return {
      filename: secureFilename,
      originalName: file.originalname,
      path: filePath,
      size: file.size,
      mimeType: file.mimetype,
      hash
    };
  }

  /**
   * Delete a stored file
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.config.uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Check if file exists
   */
  fileExists(filename: string): boolean {
    const filePath = path.join(this.config.uploadDir, filename);
    return fs.existsSync(filePath);
  }

  /**
   * Get file path for serving
   */
  getFilePath(filename: string): string {
    return path.join(this.config.uploadDir, filename);
  }

  /**
   * Get file stats
   */
  getFileStats(filename: string): fs.Stats | null {
    const filePath = path.join(this.config.uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    return fs.statSync(filePath);
  }

  /**
   * Verify file integrity
   */
  verifyFileIntegrity(filename: string, expectedHash: string): boolean {
    const filePath = path.join(this.config.uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const actualHash = this.calculateFileHash(filePath);
    return actualHash === expectedHash;
  }
}

// Default configuration
export const defaultFileStorageConfig: FileStorageConfig = {
  uploadDir: path.join(process.cwd(), 'data', 'uploads'),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ],
  allowedExtensions: [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    // Archives
    '.zip', '.rar', '.7z'
  ]
};