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

/**
 * Permission types for granular access control
 */
export enum Permission {
  // User management permissions
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  MANAGE_USER_ROLES = 'manage_user_roles',
  
  // Content management permissions
  CREATE_CONTENT = 'create_content',
  READ_CONTENT = 'read_content',
  UPDATE_CONTENT = 'update_content',
  DELETE_CONTENT = 'delete_content',
  PUBLISH_CONTENT = 'publish_content',
  
  // Document management permissions
  UPLOAD_DOCUMENT = 'upload_document',
  READ_DOCUMENT = 'read_document',
  DELETE_DOCUMENT = 'delete_document',
  MANAGE_FOLDERS = 'manage_folders',
  SET_FOLDER_PERMISSIONS = 'set_folder_permissions',
  
  // Template management permissions
  CREATE_TEMPLATE = 'create_template',
  READ_TEMPLATE = 'read_template',
  UPDATE_TEMPLATE = 'update_template',
  DELETE_TEMPLATE = 'delete_template',
  
  // System administration permissions
  SYSTEM_ADMIN = 'system_admin',
  VIEW_LOGS = 'view_logs',
  MANAGE_SETTINGS = 'manage_settings'
}

/**
 * Role-based permission mapping
 */
export const ROLE_PERMISSIONS: Record<User['role'], Permission[]> = {
  'administrator': [
    // All permissions for administrators
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.MANAGE_USER_ROLES,
    Permission.CREATE_CONTENT,
    Permission.READ_CONTENT,
    Permission.UPDATE_CONTENT,
    Permission.DELETE_CONTENT,
    Permission.PUBLISH_CONTENT,
    Permission.UPLOAD_DOCUMENT,
    Permission.READ_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.MANAGE_FOLDERS,
    Permission.SET_FOLDER_PERMISSIONS,
    Permission.CREATE_TEMPLATE,
    Permission.READ_TEMPLATE,
    Permission.UPDATE_TEMPLATE,
    Permission.DELETE_TEMPLATE,
    Permission.SYSTEM_ADMIN,
    Permission.VIEW_LOGS,
    Permission.MANAGE_SETTINGS
  ],
  'editor': [
    // Content and document management for editors
    Permission.READ_USER, // Can view user info for content attribution
    Permission.CREATE_CONTENT,
    Permission.READ_CONTENT,
    Permission.UPDATE_CONTENT,
    Permission.DELETE_CONTENT,
    Permission.PUBLISH_CONTENT,
    Permission.UPLOAD_DOCUMENT,
    Permission.READ_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.MANAGE_FOLDERS,
    Permission.READ_TEMPLATE
  ],
  'read-only': [
    // Read-only access for viewers
    Permission.READ_CONTENT,
    Permission.READ_DOCUMENT,
    Permission.READ_TEMPLATE
  ]
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (userRole: User['role'], permission: Permission): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.includes(permission);
};

/**
 * Check if a user has any of the specified permissions
 */
export const hasAnyPermission = (userRole: User['role'], permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if a user has all of the specified permissions
 */
export const hasAllPermissions = (userRole: User['role'], permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Middleware to require specific permissions
 */
export const requirePermission = (...permissions: Permission[]) => {
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

    if (!hasAnyPermission(req.user.role, permissions)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${permissions.join(' or ')}`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require all specified permissions
 */
export const requireAllPermissions = (...permissions: Permission[]) => {
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

    if (!hasAllPermissions(req.user.role, permissions)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${permissions.join(' and ')}`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Resource ownership validation
 */
export interface ResourceOwnership {
  checkOwnership: (userId: string, resourceId: string) => Promise<boolean>;
  allowAdminOverride?: boolean;
}

/**
 * Middleware to check resource ownership or admin privileges
 */
export const requireOwnershipOrAdmin = (ownership: ResourceOwnership) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // Administrators can override ownership checks if allowed
    if (ownership.allowAdminOverride !== false && req.user.role === 'administrator') {
      next();
      return;
    }

    try {
      const resourceId = req.params['id'];
      if (!resourceId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: 'Resource ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const isOwner = await ownership.checkOwnership(req.user.userId, resourceId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied. You can only access your own resources.',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'OWNERSHIP_CHECK_FAILED',
          message: 'Failed to verify resource ownership',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};