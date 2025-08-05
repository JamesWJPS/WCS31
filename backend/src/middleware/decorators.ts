import { Request, Response, NextFunction } from 'express';
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from './auth';
import { User } from '../models/interfaces';

/**
 * Authorization middleware types
 */
export interface AuthorizedRequest extends Request {
  user: {
    userId: string;
    username: string;
    role: User['role'];
  };
}

/**
 * Authorization options for middleware
 */
export interface AuthorizationOptions {
  permissions?: Permission[];
  requireAll?: boolean; // If true, requires all permissions; if false, requires any permission
  allowSelf?: boolean; // Allow access to own resources
  adminOverride?: boolean; // Allow administrators to override restrictions
  paramName?: string; // Parameter name for resource ID (default: 'id')
}

/**
 * Middleware factory for requiring specific permissions
 */
export const requirePermissions = (permissions: Permission[], requireAll: boolean = false) => {
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

    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(req.user.role, permissions)
      : hasAnyPermission(req.user.role, permissions);

    if (!hasRequiredPermissions) {
      const operator = requireAll ? ' and ' : ' or ';
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${permissions.join(operator)}`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for requiring administrator role
 */
export const requireAdminRole = (req: Request, res: Response, next: NextFunction): void => {
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

  if (req.user.role !== 'administrator') {
    res.status(403).json({
      success: false,
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'Administrator privileges required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

/**
 * Middleware for requiring editor or administrator role
 */
export const requireEditorRole = (req: Request, res: Response, next: NextFunction): void => {
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

  if (!['administrator', 'editor'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'EDITOR_REQUIRED',
        message: 'Editor or administrator privileges required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

/**
 * Middleware factory for resource ownership validation
 */
export const requireOwnership = (
  ownershipCheck: (userId: string, resourceId: string) => Promise<boolean>,
  options: { adminOverride?: boolean; paramName?: string } = {}
) => {
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

    // Allow admin override if specified
    if (options.adminOverride !== false && req.user.role === 'administrator') {
      next();
      return;
    }

    try {
      const paramName = options.paramName || 'id';
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: `Resource ID parameter '${paramName}' is required`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const isOwner = await ownershipCheck(req.user.userId, resourceId);
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

/**
 * Middleware factory for conditional authorization based on request context
 */
export const conditionalAuth = (options: AuthorizationOptions) => {
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

    // Check admin override
    if (options.adminOverride !== false && req.user.role === 'administrator') {
      next();
      return;
    }

    // Check self access
    const userIdParam = options.paramName || 'id';
    if (options.allowSelf && req.params[userIdParam] === req.user.userId) {
      next();
      return;
    }

    // Check permissions
    if (options.permissions && options.permissions.length > 0) {
      const hasRequiredPermissions = options.requireAll 
        ? hasAllPermissions(req.user.role, options.permissions)
        : hasAnyPermission(req.user.role, options.permissions);

      if (!hasRequiredPermissions) {
        const operator = options.requireAll ? ' and ' : ' or ';
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Insufficient permissions. Required: ${options.permissions.join(operator)}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
    }

    next();
  };
};

/**
 * Middleware for checking content access permissions
 */
export const requireContentAccess = (req: Request, res: Response, next: NextFunction): void => {
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

  // All authenticated users can read published content
  // Editors and admins can access all content
  if (hasPermission(req.user.role, Permission.READ_CONTENT)) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: {
      code: 'CONTENT_ACCESS_DENIED',
      message: 'Insufficient permissions to access content',
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Middleware for checking document access permissions
 */
export const requireDocumentAccess = (req: Request, res: Response, next: NextFunction): void => {
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

  // All authenticated users can read documents (folder permissions will be checked separately)
  if (hasPermission(req.user.role, Permission.READ_DOCUMENT)) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: {
      code: 'DOCUMENT_ACCESS_DENIED',
      message: 'Insufficient permissions to access documents',
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Middleware for checking template access permissions
 */
export const requireTemplateAccess = (operation: 'read' | 'create' | 'update' | 'delete') => {
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

    const permissionMap = {
      read: Permission.READ_TEMPLATE,
      create: Permission.CREATE_TEMPLATE,
      update: Permission.UPDATE_TEMPLATE,
      delete: Permission.DELETE_TEMPLATE
    };

    const requiredPermission = permissionMap[operation];
    
    if (hasPermission(req.user.role, requiredPermission)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'TEMPLATE_ACCESS_DENIED',
        message: `Insufficient permissions to ${operation} templates`,
        timestamp: new Date().toISOString()
      }
    });
  };
};