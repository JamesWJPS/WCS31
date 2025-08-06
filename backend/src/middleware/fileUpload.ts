import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { FileStorage, defaultFileStorageConfig } from '../utils/fileStorage';

// Configure multer for memory storage (we'll handle file storage manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: defaultFileStorageConfig.maxFileSize,
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const fileStorage = new FileStorage(defaultFileStorageConfig);
    const validation = fileStorage.validateFile(file as Express.Multer.File);
    
    if (validation.isValid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error || 'Invalid file'));
    }
  }
});

/**
 * Middleware for single file upload
 */
export const uploadSingle = (fieldName: string = 'file') => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds maximum allowed size of ${defaultFileStorageConfig.maxFileSize} bytes`,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'TOO_MANY_FILES',
              message: 'Too many files uploaded',
              timestamp: new Date().toISOString()
            }
          });
        }
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      if (err) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: err.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      next();
    });
  };
};

/**
 * Middleware for multiple file upload
 */
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds maximum allowed size of ${defaultFileStorageConfig.maxFileSize} bytes`,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'TOO_MANY_FILES',
              message: `Too many files uploaded. Maximum allowed: ${maxCount}`,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      if (err) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: err.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      next();
    });
  };
};

/**
 * Middleware to validate file permissions before upload
 */
export const validateUploadPermissions = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  const folderId = req.body.folderId || req.params.folderId;
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  if (!folderId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FOLDER',
        message: 'Folder ID is required for file upload',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Store folder ID for later use in the controller
  req.uploadFolderId = folderId;
  next();
};

// Extend Express Request interface to include upload folder ID
declare global {
  namespace Express {
    interface Request {
      uploadFolderId?: string;
    }
  }
}