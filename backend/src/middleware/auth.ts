import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTPayload } from '../utils/jwt';
import { UserRepository } from '../models/UserRepository';
import { User } from '../models/interfaces';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const payload = JWTUtils.verifyToken(token);
    
    // Verify user still exists and is active
    const userRepository = new UserRepository();
    const user = await userRepository.findById(payload.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_USER',
          message: 'User account is invalid or inactive',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Middleware to require specific user roles
 */
export const requireRole = (...roles: User['role'][]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require administrator role
 */
export const requireAdmin = requireRole('administrator');

/**
 * Middleware to require administrator or editor role
 */
export const requireEditor = requireRole('administrator', 'editor');

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = JWTUtils.verifyToken(token);
      
      // Verify user still exists and is active
      const userRepository = new UserRepository();
      const user = await userRepository.findById(payload.userId);
      
      if (user && user.isActive) {
        req.user = payload;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
};