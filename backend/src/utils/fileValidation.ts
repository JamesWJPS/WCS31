import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { AppError } from './AppError';

export interface FileValidationOptions {
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  requireFileType?: boolean;
  scanForMalware?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedFilename?: string;
}

export class FileValidator {
  private static readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1', '.py', '.rb', '.pl'
  ];

  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_FILES = 10;

  /**
   * Validate uploaded file
   */
  static validateFile(file: Express.Multer.File, options: FileValidationOptions = {}): FileValidationResult {
    const errors: string[] = [];
    
    // Set default options
    const opts = {
      allowedMimeTypes: options.allowedMimeTypes || this.ALLOWED_MIME_TYPES,
      allowedExtensions: options.allowedExtensions || [],
      maxFileSize: options.maxFileSize || this.MAX_FILE_SIZE,
      requireFileType: options.requireFileType !== false,
      scanForMalware: options.scanForMalware || false,
      ...options
    };

    // Validate file exists
    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Validate file size
    if (file.size > opts.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${opts.maxFileSize} bytes`);
    }

    // Validate file extension
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Check for dangerous extensions
    if (this.DANGEROUS_EXTENSIONS.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed for security reasons`);
    }

    // Check allowed extensions if specified
    if (opts.allowedExtensions.length > 0 && !opts.allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    // Validate MIME type
    if (opts.requireFileType && !opts.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Validate filename
    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    if (!sanitizedFilename) {
      errors.push('Invalid filename');
    }

    // Check for file content validation
    if (opts.scanForMalware) {
      const contentValidation = this.validateFileContent(file);
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedFilename
    };
  }

  /**
   * Validate multiple files
   */
  static validateFiles(files: Express.Multer.File[], options: FileValidationOptions = {}): FileValidationResult {
    const errors: string[] = [];
    
    // Check file count
    const maxFiles = options.maxFiles || this.MAX_FILES;
    if (files.length > maxFiles) {
      errors.push(`Too many files. Maximum allowed: ${maxFiles}`);
    }

    // Validate each file
    files.forEach((file, index) => {
      const validation = this.validateFile(file, options);
      if (!validation.isValid) {
        errors.push(`File ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';
    
    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
    
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
    
    // Ensure filename is not empty after sanitization
    if (!sanitized) {
      sanitized = `file_${Date.now()}`;
    }
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, 255 - ext.length) + ext;
    }
    
    return sanitized;
  }

  /**
   * Validate file content for potential threats
   */
  static validateFileContent(file: Express.Multer.File): FileValidationResult {
    const errors: string[] = [];
    
    try {
      // Check for embedded scripts in images
      if (file.mimetype.startsWith('image/')) {
        const buffer = file.buffer;
        if (buffer) {
          // Look for script tags or javascript in image files
          const content = buffer.toString('utf8');
          if (content.includes('<script') || content.includes('javascript:') || content.includes('vbscript:')) {
            errors.push('Image file contains potentially malicious content');
          }
        }
      }

      // Check for macro-enabled Office documents
      if (file.mimetype.includes('officedocument') && file.originalname.includes('macro')) {
        errors.push('Macro-enabled documents are not allowed');
      }

      // Check file signature matches MIME type
      if (!this.validateFileSignature(file)) {
        errors.push('File signature does not match declared type');
      }

    } catch (error) {
      errors.push('Error validating file content');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file signature (magic numbers)
   */
  static validateFileSignature(file: Express.Multer.File): boolean {
    if (!file.buffer) return true; // Skip if no buffer available
    
    const buffer = file.buffer;
    const signatures: { [key: string]: number[][] } = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
      'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]]
    };

    const expectedSignatures = signatures[file.mimetype];
    if (!expectedSignatures) return true; // No signature check for this type

    return expectedSignatures.some(signature => {
      if (buffer.length < signature.length) return false;
      return signature.every((byte, index) => buffer[index] === byte);
    });
  }

  /**
   * Generate secure filename
   */
  static generateSecureFilename(originalName: string, userId?: string): string {
    const extension = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const userPrefix = userId ? `${userId}_` : '';
    
    return `${userPrefix}${timestamp}_${random}${extension}`;
  }
}

/**
 * Express middleware for file validation
 */
export const validateFileUpload = (options: FileValidationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.file) {
        const validation = FileValidator.validateFile(req.file, options);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_VALIDATION_ERROR',
              message: `File validation failed: ${validation.errors.join(', ')}`
            }
          });
        }
        
        // Update filename with sanitized version
        if (validation.sanitizedFilename) {
          req.file.originalname = validation.sanitizedFilename;
        }
      }

      if (req.files && Array.isArray(req.files)) {
        const validation = FileValidator.validateFiles(req.files, options);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_VALIDATION_ERROR',
              message: `File validation failed: ${validation.errors.join(', ')}`
            }
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};