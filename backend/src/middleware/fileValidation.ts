import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import path from 'path';

interface FileValidationOptions {
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  requireFileType?: boolean;
}

export class FileValidator {
  private options: Required<FileValidationOptions>;

  constructor(options: FileValidationOptions = {}) {
    this.options = {
      allowedMimeTypes: options.allowedMimeTypes || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      allowedExtensions: options.allowedExtensions || [
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.pdf', '.txt', '.doc', '.docx'
      ],
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 5,
      requireFileType: options.requireFileType || true
    };
  }

  /**
   * Validate file upload middleware
   */
  validateUpload() {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        // Check if files exist
        const files = req.files as Express.Multer.File[] || (req.file ? [req.file] : []);
        
        if (files.length === 0) {
          throw new AppError('No files uploaded', 400, 'NO_FILES_UPLOADED');
        }

        // Check file count
        if (files.length > this.options.maxFiles) {
          throw new AppError(`Too many files. Maximum ${this.options.maxFiles} allowed`, 400, 'TOO_MANY_FILES');
        }

        // Validate each file
        files.forEach((file, index) => {
          this.validateSingleFile(file, index);
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private validateSingleFile(file: Express.Multer.File, index: number): void {
    // Check file size
    if (file.size > this.options.maxFileSize) {
      throw new AppError(
        `File ${index + 1} is too large. Maximum size is ${this.options.maxFileSize / (1024 * 1024)}MB`,
        400,
        'FILE_TOO_LARGE'
      );
    }

    // Check MIME type
    if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(
        `File ${index + 1} has invalid type: ${file.mimetype}`,
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.options.allowedExtensions.includes(ext)) {
      throw new AppError(
        `File ${index + 1} has invalid extension: ${ext}`,
        400,
        'INVALID_FILE_EXTENSION'
      );
    }

    // Check for dangerous file patterns
    this.checkDangerousPatterns(file);

    // Validate file content matches extension
    if (this.options.requireFileType) {
      this.validateFileContent(file);
    }
  }

  private checkDangerousPatterns(file: Express.Multer.File): void {
    const filename = file.originalname.toLowerCase();
    
    // Check for executable extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1', '.py', '.rb', '.pl'
    ];

    const ext = path.extname(filename);
    if (dangerousExtensions.includes(ext)) {
      throw new AppError('Executable files are not allowed', 400, 'EXECUTABLE_FILE_BLOCKED');
    }

    // Check for double extensions
    const parts = filename.split('.');
    if (parts.length > 2) {
      const secondExt = '.' + parts[parts.length - 2];
      if (dangerousExtensions.includes(secondExt)) {
        throw new AppError('Files with double extensions are not allowed', 400, 'DOUBLE_EXTENSION_BLOCKED');
      }
    }

    // Check for null bytes in filename
    if (filename.includes('\x00')) {
      throw new AppError('Invalid filename characters', 400, 'INVALID_FILENAME');
    }
  }

  private validateFileContent(file: Express.Multer.File): void {
    // Basic file signature validation
    const buffer = file.buffer;
    if (!buffer || buffer.length < 4) return;

    const signatures: { [key: string]: number[][] } = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38]],
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]]
    };

    const mimeType = file.mimetype;
    const expectedSignatures = signatures[mimeType];

    if (expectedSignatures) {
      const fileHeader = Array.from(buffer.slice(0, 8));
      const isValid = expectedSignatures.some(signature =>
        signature.every((byte, index) => fileHeader[index] === byte)
      );

      if (!isValid) {
        throw new AppError(
          'File content does not match declared type',
          400,
          'FILE_CONTENT_MISMATCH'
        );
      }
    }
  }
}

// Default file validator for general uploads
export const defaultFileValidator = new FileValidator();

// Strict validator for sensitive uploads
export const strictFileValidator = new FileValidator({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 3,
  requireFileType: true
});

// Image-only validator
export const imageValidator = new FileValidator({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  maxFileSize: 2 * 1024 * 1024, // 2MB
  maxFiles: 1,
  requireFileType: true
});

// Document validator
export const documentValidator = new FileValidator({
  allowedMimeTypes: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.pdf', '.txt', '.doc', '.docx'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  requireFileType: true
});