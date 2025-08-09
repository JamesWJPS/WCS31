import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    firstRequest: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      message: options.message || 'Too many requests, please try again later',
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private defaultKeyGenerator(req: Request): string {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key] && this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.options.keyGenerator(req);
      const now = Date.now();
      
      // Initialize or get existing record
      if (!this.store[key] || this.store[key].resetTime < now) {
        this.store[key] = {
          count: 0,
          resetTime: now + this.options.windowMs,
          firstRequest: now
        };
      }

      const record = this.store[key];
      
      // Check if limit exceeded
      if (record.count >= this.options.maxRequests) {
        const resetTime = Math.ceil((record.resetTime - now) / 1000);
        
        res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', resetTime);
        
        throw new AppError(this.options.message, 429, 'RATE_LIMIT_EXCEEDED');
      }

      // Increment counter
      record.count++;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.options.maxRequests - record.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil((record.resetTime - now) / 1000));

      // Handle response to potentially decrement counter
      const originalSend = res.send;
      const self = this;
      res.send = function(body: any) {
        const statusCode = res.statusCode;
        
        // Decrement counter for successful requests if configured
        if (self.options.skipSuccessfulRequests && statusCode < 400) {
          record.count = Math.max(0, record.count - 1);
        }
        
        // Decrement counter for failed requests if configured
        if (self.options.skipFailedRequests && statusCode >= 400) {
          record.count = Math.max(0, record.count - 1);
        }
        
        return originalSend.call(this, body);
      };

      next();
    };
  }
}

// Predefined rate limiters for different endpoints
export const generalRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per window
  message: 'Too many requests from this IP, please try again later'
});

export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env['NODE_ENV'] === 'test' ? 3 : 5, // 3 attempts in test, 5 in production
  message: 'Too many authentication attempts, please try again later'
});

export const uploadRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
  message: 'Too many file uploads, please try again later'
});

export const apiRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 API calls per window
  message: 'API rate limit exceeded, please try again later'
});

// User-specific rate limiter
export const createUserRateLimit = (userId: string) => new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 200,
  keyGenerator: () => `user:${userId}`,
  message: 'User rate limit exceeded'
});

// Endpoint-specific rate limiters
export const contentCreationRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100, // 100 content creations per hour
  message: 'Too many content creation requests'
});

export const documentUploadRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 document uploads per hour
  message: 'Too many document uploads'
});