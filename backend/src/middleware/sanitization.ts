import { Request, Response, NextFunction } from 'express';
import { InputSanitizer, SanitizationOptions } from '../utils/sanitization';

export interface SanitizationMiddlewareOptions {
  body?: SanitizationOptions | false;
  query?: SanitizationOptions | false;
  params?: SanitizationOptions | false;
}

/**
 * Middleware to sanitize request inputs
 */
export const sanitizeInputs = (options: SanitizationMiddlewareOptions = {}) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Sanitize request body
      if (req.body && options.body !== false) {
        req.body = InputSanitizer.sanitizeObject(req.body, options.body || {});
      }
      
      // Sanitize query parameters
      if (req.query && options.query !== false) {
        req.query = InputSanitizer.sanitizeObject(req.query, options.query || {});
      }
      
      // Sanitize route parameters
      if (req.params && options.params !== false) {
        req.params = InputSanitizer.sanitizeObject(req.params, options.params || {});
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware specifically for content sanitization
 */
export const sanitizeContent = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    // Sanitize HTML content fields
    if (req.body.body) {
      req.body.body = InputSanitizer.sanitizeHtml(req.body.body);
    }
    
    if (req.body.title) {
      req.body.title = InputSanitizer.sanitizeText(req.body.title, { maxLength: 200 });
    }
    
    if (req.body.slug) {
      req.body.slug = InputSanitizer.sanitizeText(req.body.slug, { stripTags: true, maxLength: 100 });
    }
    
    // Sanitize metadata
    if (req.body.metadata) {
      req.body.metadata = InputSanitizer.sanitizeObject(req.body.metadata);
    }
  }
  
  next();
};

/**
 * Middleware for file upload sanitization
 */
export const sanitizeFileUpload = (req: Request, _res: Response, next: NextFunction) => {
  if (req.file) {
    // Sanitize filename
    req.file.originalname = InputSanitizer.sanitizeFilename(req.file.originalname);
  }
  
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach(file => {
      file.originalname = InputSanitizer.sanitizeFilename(file.originalname);
    });
  }
  
  // Sanitize file metadata in body
  if (req.body) {
    if (req.body.title) {
      req.body.title = InputSanitizer.sanitizeText(req.body.title, { maxLength: 200 });
    }
    
    if (req.body.description) {
      req.body.description = InputSanitizer.sanitizeText(req.body.description, { maxLength: 1000 });
    }
    
    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        req.body.tags = req.body.tags.map((tag: string) => 
          InputSanitizer.sanitizeText(tag, { stripTags: true, maxLength: 50 })
        );
      }
    }
  }
  
  next();
};