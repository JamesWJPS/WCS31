import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from '../utils/AppError';

interface CSRFOptions {
  secret?: string;
  tokenLength?: number;
  headerName?: string;
  cookieName?: string;
  ignoreMethods?: string[];
}

export class CSRFProtection {
  private secret: string;
  private tokenLength: number;
  private headerName: string;
  private cookieName: string;
  private ignoreMethods: Set<string>;

  constructor(options: CSRFOptions = {}) {
    this.secret = options.secret || process.env['CSRF_SECRET'] || crypto.randomBytes(32).toString('hex');
    this.tokenLength = options.tokenLength || 32;
    this.headerName = options.headerName || 'x-csrf-token';
    this.cookieName = options.cookieName || 'csrf-token';
    this.ignoreMethods = new Set(options.ignoreMethods || ['GET', 'HEAD', 'OPTIONS']);
  }

  /**
   * Generate CSRF token
   */
  generateToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(this.tokenLength / 2).toString('hex');
    const payload = `${sessionId}:${timestamp}:${randomBytes}`;
    
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    
    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  /**
   * Verify CSRF token
   */
  verifyToken(token: string, sessionId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts = decoded.split(':');
      
      if (parts.length !== 4) return false;
      
      const [tokenSessionId, timestamp, randomBytes, signature] = parts;
      
      // Verify session ID matches
      if (tokenSessionId !== sessionId) return false;
      
      // Verify token is not too old (1 hour)
      const tokenTime = parseInt(timestamp || '0');
      const now = Date.now();
      if (now - tokenTime > 3600000) return false;
      
      // Verify signature
      const payload = `${tokenSessionId}:${timestamp}:${randomBytes}`;
      const hmac = crypto.createHmac('sha256', this.secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature || '', 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Middleware to generate and set CSRF token
   */
  generateMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Get or create session ID
      const sessionId = req.session?.id || req.headers['x-session-id'] as string || 'anonymous';
      
      // Generate token
      const token = this.generateToken(sessionId);
      
      // Set token in response header and cookie
      res.setHeader('X-CSRF-Token', token);
      res.cookie(this.cookieName, token, {
        httpOnly: false, // Allow JavaScript access for AJAX requests
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
      });
      
      // Store token in locals for template access
      res.locals['csrfToken'] = token;
      
      next();
    };
  }

  /**
   * Middleware to verify CSRF token
   */
  verifyMiddleware() {
    return (req: Request, _res: Response, next: NextFunction) => {
      // Skip verification for safe methods
      if (this.ignoreMethods.has(req.method)) {
        return next();
      }

      // Get session ID
      const sessionId = req.session?.id || req.headers['x-session-id'] as string || 'anonymous';
      
      // Get token from header or body
      const token = req.headers[this.headerName] as string || 
                   req.body._csrf || 
                   req.query['_csrf'] as string;

      if (!token) {
        throw new AppError('CSRF token missing', 403, 'CSRF_TOKEN_MISSING');
      }

      if (!this.verifyToken(token, sessionId)) {
        throw new AppError('Invalid CSRF token', 403, 'CSRF_TOKEN_INVALID');
      }

      next();
    };
  }
}

// Create default CSRF protection instance
export const csrfProtection = new CSRFProtection();

// Export middleware functions
export const generateCSRFToken = csrfProtection.generateMiddleware();
export const verifyCSRFToken = csrfProtection.verifyMiddleware();