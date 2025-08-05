import { Request, Response, NextFunction } from 'express';
import { 
  requirePermissions,
  requireAdminRole,
  requireEditorRole,
  requireOwnership,
  conditionalAuth,
  requireContentAccess,
  requireDocumentAccess,
  requireTemplateAccess
} from '../../middleware/decorators';
import { Permission } from '../../middleware/auth';

describe('Authorization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requirePermissions', () => {
    it('should allow user with required permission', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      const middleware = requirePermissions([Permission.CREATE_CONTENT]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow user with any of multiple permissions', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      const middleware = requirePermissions([Permission.CREATE_CONTENT, Permission.SYSTEM_ADMIN]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user without required permission', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'readonly',
        role: 'read-only'
      };

      const middleware = requirePermissions([Permission.CREATE_CONTENT]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${Permission.CREATE_CONTENT}`,
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      const middleware = requirePermissions([Permission.CREATE_CONTENT]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require all permissions when requireAll is true', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      const middleware = requirePermissions([Permission.CREATE_CONTENT, Permission.UPDATE_CONTENT], true);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user missing any permission when requireAll is true', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'readonly',
        role: 'read-only'
      };

      const middleware = requirePermissions([Permission.CREATE_CONTENT, Permission.UPDATE_CONTENT], true);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${Permission.CREATE_CONTENT} and ${Permission.UPDATE_CONTENT}`,
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdminRole', () => {
    it('should allow administrator', () => {
      mockRequest.user = {
        userId: 'admin-123',
        username: 'admin',
        role: 'administrator'
      };

      requireAdminRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-administrator', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      requireAdminRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ADMIN_REQUIRED',
          message: 'Administrator privileges required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      requireAdminRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireEditorRole', () => {
    it('should allow administrator', () => {
      mockRequest.user = {
        userId: 'admin-123',
        username: 'admin',
        role: 'administrator'
      };

      requireEditorRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow editor', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      requireEditorRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject read-only user', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'readonly',
        role: 'read-only'
      };

      requireEditorRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'EDITOR_REQUIRED',
          message: 'Editor or administrator privileges required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      requireEditorRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow resource owner', async () => {
      mockRequest.user = {
        userId: 'owner-123',
        username: 'owner',
        role: 'editor'
      };
      mockRequest.params = { id: 'resource-123' };

      const ownershipCheck = jest.fn().mockResolvedValue(true);
      const middleware = requireOwnership(ownershipCheck);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(ownershipCheck).toHaveBeenCalledWith('owner-123', 'resource-123');
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-owner', async () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'user',
        role: 'editor'
      };
      mockRequest.params = { id: 'resource-123' };

      const ownershipCheck = jest.fn().mockResolvedValue(false);
      const middleware = requireOwnership(ownershipCheck);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied. You can only access your own resources.',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow administrator with admin override', async () => {
      mockRequest.user = {
        userId: 'admin-123',
        username: 'admin',
        role: 'administrator'
      };
      mockRequest.params = { id: 'resource-123' };

      const ownershipCheck = jest.fn();
      const middleware = requireOwnership(ownershipCheck, { adminOverride: true });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(ownershipCheck).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without resource ID', async () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'user',
        role: 'editor'
      };
      mockRequest.params = {};

      const ownershipCheck = jest.fn();
      const middleware = requireOwnership(ownershipCheck);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_RESOURCE_ID',
          message: "Resource ID parameter 'id' is required",
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle ownership check errors', async () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'user',
        role: 'editor'
      };
      mockRequest.params = { id: 'resource-123' };

      const ownershipCheck = jest.fn().mockRejectedValue(new Error('Database error'));
      const middleware = requireOwnership(ownershipCheck);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'OWNERSHIP_CHECK_FAILED',
          message: 'Failed to verify resource ownership',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('conditionalAuth', () => {
    it('should allow administrator with admin override', () => {
      mockRequest.user = {
        userId: 'admin-123',
        username: 'admin',
        role: 'administrator'
      };
      mockRequest.params = { userId: 'user-123' };

      const middleware = conditionalAuth({ 
        permissions: [Permission.READ_USER], 
        allowSelf: true,
        adminOverride: true 
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow self access', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'user',
        role: 'read-only'
      };
      mockRequest.params = { userId: 'user-123' };

      const middleware = conditionalAuth({ 
        permissions: [Permission.READ_USER], 
        allowSelf: true,
        adminOverride: true 
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow user with required permission', () => {
      mockRequest.user = {
        userId: 'admin-123',
        username: 'admin',
        role: 'administrator'
      };
      mockRequest.params = { userId: 'other-user' };

      const middleware = conditionalAuth({ 
        permissions: [Permission.READ_USER], 
        allowSelf: true,
        adminOverride: true 
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user without permission and not self', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'user',
        role: 'read-only'
      };
      mockRequest.params = { userId: 'other-user' };

      const middleware = conditionalAuth({ 
        permissions: [Permission.READ_USER], 
        allowSelf: true,
        adminOverride: true 
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${Permission.READ_USER}`,
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      const middleware = conditionalAuth({ 
        permissions: [Permission.READ_USER], 
        allowSelf: true,
        adminOverride: true 
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireTemplateAccess', () => {
    it('should allow all users to read templates', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'user',
        role: 'read-only'
      };

      const middleware = requireTemplateAccess('read');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow administrators to create templates', () => {
      mockRequest.user = {
        userId: 'admin-123',
        username: 'admin',
        role: 'administrator'
      };

      const middleware = requireTemplateAccess('create');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-administrators from creating templates', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'editor',
        role: 'editor'
      };

      const middleware = requireTemplateAccess('create');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEMPLATE_ACCESS_DENIED',
          message: 'Insufficient permissions to create templates',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      const middleware = requireTemplateAccess('read');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireContentAccess', () => {
    it('should allow all authenticated users to access content', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'user',
        role: 'read-only'
      };

      requireContentAccess(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      requireContentAccess(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireDocumentAccess', () => {
    it('should allow all authenticated users to access documents', () => {
      mockRequest.user = {
        userId: 'user-123',
        username: 'user',
        role: 'read-only'
      };

      requireDocumentAccess(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      delete mockRequest.user;

      requireDocumentAccess(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});