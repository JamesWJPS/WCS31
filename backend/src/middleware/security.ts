import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { sanitizeInputs } from './sanitization';
import { verifyCSRFToken, generateCSRFToken } from './csrf';
import { generalRateLimit, authRateLimit, uploadRateLimit } from './rateLimiting';
import { AppError } from '../utils/AppError';

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for CMS functionality
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration
 */
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
});

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (req: Request, _res: Response, next: NextFunction) => {
  const maxSize = {
    json: 1024 * 1024, // 1MB for JSON
    urlencoded: 1024 * 1024, // 1MB for form data
    raw: 10 * 1024 * 1024, // 10MB for file uploads
  };

  const contentLength = parseInt(req.headers['content-length'] || '0');
  const contentType = req.headers['content-type'] || '';

  let limit = maxSize.raw; // Default to largest limit

  if (contentType.includes('application/json')) {
    limit = maxSize.json;
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    limit = maxSize.urlencoded;
  }

  if (contentLength > limit) {
    throw new AppError('Request entity too large', 413, 'REQUEST_TOO_LARGE');
  }

  next();
};

/**
 * IP whitelist/blacklist middleware
 */
export const ipFilter = (req: Request, _res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || '';
  
  // Check blacklist
  const blacklistedIPs = process.env['BLACKLISTED_IPS']?.split(',') || [];
  if (blacklistedIPs.includes(clientIP)) {
    throw new AppError('Access denied', 403, 'IP_BLACKLISTED');
  }

  // Check whitelist (if configured)
  const whitelistedIPs = process.env['WHITELISTED_IPS']?.split(',') || [];
  if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(clientIP)) {
    throw new AppError('Access denied', 403, 'IP_NOT_WHITELISTED');
  }

  next();
};

/**
 * Request logging for security monitoring
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /vbscript:/i,  // VBScript injection
  ];

  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params
  });

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData));

  if (isSuspicious) {
    console.warn('Suspicious request detected:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Log response time and status
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (res.statusCode >= 400 || duration > 5000) {
      console.log('Security log:', {
        ip: req.ip,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

/**
 * Comprehensive security middleware stack
 */
export const applySecurity = (app: any) => {
  // Basic security headers
  app.use(securityHeaders);
  
  // CORS configuration
  app.use(corsConfig);
  
  // Request size limiting
  app.use(requestSizeLimit);
  
  // IP filtering
  app.use(ipFilter);
  
  // Security logging
  app.use(securityLogger);
  
  // Input sanitization (applied globally)
  app.use(sanitizeInputs({
    body: { stripTags: false, maxLength: 10000 },
    query: { stripTags: true, maxLength: 1000 },
    params: { stripTags: true, maxLength: 100 }
  }));
  
  // General rate limiting
  app.use('/api', generalRateLimit.middleware());
  
  // CSRF token generation for safe methods
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      generateCSRFToken(req, res, next);
    } else {
      next();
    }
  });
};

/**
 * Route-specific security middleware
 */
export const routeSecurity = {
  // Authentication routes
  auth: [
    authRateLimit.middleware(),
    verifyCSRFToken
  ],
  
  // File upload routes
  upload: [
    uploadRateLimit.middleware(),
    verifyCSRFToken
  ],
  
  // Content modification routes
  content: [
    verifyCSRFToken,
    sanitizeInputs({
      body: { allowHtml: true, maxLength: 50000 }
    })
  ],
  
  // User management routes
  users: [
    verifyCSRFToken,
    sanitizeInputs({
      body: { stripTags: true, maxLength: 1000 }
    })
  ]
};