import { User } from '../models/interfaces';
import { Permission, ROLE_PERMISSIONS, hasPermission } from '../middleware/auth';

/**
 * Role hierarchy for permission inheritance
 */
export const ROLE_HIERARCHY: Record<User['role'], number> = {
  'read-only': 1,
  'editor': 2,
  'administrator': 3
};

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  code?: string;
}

/**
 * Role validation utilities
 */
export class RoleValidator {
  /**
   * Validate if a role is valid
   */
  static isValidRole(role: string): role is User['role'] {
    return ['administrator', 'editor', 'read-only'].includes(role);
  }

  /**
   * Validate if a user can be assigned a specific role
   */
  static canAssignRole(assignerRole: User['role'], targetRole: User['role']): ValidationResult {
    // Only administrators can assign roles
    if (assignerRole !== 'administrator') {
      return {
        isValid: false,
        message: 'Only administrators can assign user roles',
        code: 'INSUFFICIENT_PRIVILEGES'
      };
    }

    // Validate target role
    if (!this.isValidRole(targetRole)) {
      return {
        isValid: false,
        message: 'Invalid role specified',
        code: 'INVALID_ROLE'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate if a user can modify another user's account
   */
  static canModifyUser(modifierRole: User['role'], _targetRole: User['role'], isSelf: boolean = false): ValidationResult {
    // Users can always modify their own profile (limited fields)
    if (isSelf) {
      return { isValid: true };
    }

    // Only administrators can modify other users
    if (modifierRole !== 'administrator') {
      return {
        isValid: false,
        message: 'Only administrators can modify other user accounts',
        code: 'INSUFFICIENT_PRIVILEGES'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate if a user can delete another user's account
   */
  static canDeleteUser(deleterRole: User['role'], _targetRole: User['role'], isSelf: boolean = false): ValidationResult {
    // Users cannot delete their own account
    if (isSelf) {
      return {
        isValid: false,
        message: 'Users cannot delete their own account',
        code: 'SELF_DELETE_FORBIDDEN'
      };
    }

    // Only administrators can delete users
    if (deleterRole !== 'administrator') {
      return {
        isValid: false,
        message: 'Only administrators can delete user accounts',
        code: 'INSUFFICIENT_PRIVILEGES'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate content access permissions
   */
  static canAccessContent(
    userRole: User['role'], 
    contentStatus: 'draft' | 'published' | 'archived',
    isOwner: boolean = false
  ): ValidationResult {
    // Published content is accessible to all authenticated users
    if (contentStatus === 'published') {
      return { isValid: true };
    }

    // Draft and archived content requires ownership or editor privileges
    if (isOwner || hasPermission(userRole, Permission.UPDATE_CONTENT)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      message: 'Insufficient permissions to access this content',
      code: 'CONTENT_ACCESS_DENIED'
    };
  }

  /**
   * Validate document access permissions
   */
  static canAccessDocument(
    userRole: User['role'],
    isPublicFolder: boolean,
    hasExplicitAccess: boolean = false
  ): ValidationResult {
    // Public documents are accessible to all
    if (isPublicFolder) {
      return { isValid: true };
    }

    // Private documents require explicit access or higher permissions (editor/admin)
    if (hasExplicitAccess || hasPermission(userRole, Permission.UPLOAD_DOCUMENT)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      message: 'Insufficient permissions to access this document',
      code: 'DOCUMENT_ACCESS_DENIED'
    };
  }

  /**
   * Validate folder permission management
   */
  static canManageFolderPermissions(userRole: User['role'], isOwner: boolean = false): ValidationResult {
    // Folder owners can always manage permissions
    if (isOwner) {
      return { isValid: true };
    }

    // Only administrators have SET_FOLDER_PERMISSIONS, but editors can manage folders they create
    if (hasPermission(userRole, Permission.SET_FOLDER_PERMISSIONS) || hasPermission(userRole, Permission.MANAGE_FOLDERS)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      message: 'Insufficient permissions to manage folder permissions',
      code: 'FOLDER_PERMISSION_DENIED'
    };
  }

  /**
   * Validate template access permissions
   */
  static canAccessTemplate(userRole: User['role'], operation: 'read' | 'create' | 'update' | 'delete'): ValidationResult {
    const permissionMap = {
      read: Permission.READ_TEMPLATE,
      create: Permission.CREATE_TEMPLATE,
      update: Permission.UPDATE_TEMPLATE,
      delete: Permission.DELETE_TEMPLATE
    };

    const requiredPermission = permissionMap[operation];
    
    if (hasPermission(userRole, requiredPermission)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      message: `Insufficient permissions to ${operation} templates`,
      code: 'TEMPLATE_ACCESS_DENIED'
    };
  }

  /**
   * Get role hierarchy level
   */
  static getRoleLevel(role: User['role']): number {
    return ROLE_HIERARCHY[role];
  }

  /**
   * Check if one role has higher privileges than another
   */
  static hasHigherPrivileges(role1: User['role'], role2: User['role']): boolean {
    return this.getRoleLevel(role1) > this.getRoleLevel(role2);
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: User['role']): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Validate bulk operations permissions
   */
  static canPerformBulkOperation(
    userRole: User['role'], 
    operation: 'delete' | 'update' | 'publish',
    resourceType: 'content' | 'document' | 'user'
  ): ValidationResult {
    // Define required permissions for bulk operations
    const bulkPermissions: Record<string, Permission> = {
      'delete_content': Permission.DELETE_CONTENT,
      'update_content': Permission.UPDATE_CONTENT,
      'publish_content': Permission.PUBLISH_CONTENT,
      'delete_document': Permission.DELETE_DOCUMENT,
      'update_document': Permission.UPLOAD_DOCUMENT, // Reuse upload permission for updates
      'delete_user': Permission.DELETE_USER,
      'update_user': Permission.UPDATE_USER
    };

    const permissionKey = `${operation}_${resourceType}`;
    const requiredPermission = bulkPermissions[permissionKey];

    if (!requiredPermission) {
      return {
        isValid: false,
        message: 'Invalid bulk operation specified',
        code: 'INVALID_BULK_OPERATION'
      };
    }

    if (hasPermission(userRole, requiredPermission)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      message: `Insufficient permissions for bulk ${operation} operation on ${resourceType}`,
      code: 'BULK_OPERATION_DENIED'
    };
  }

  /**
   * Validate system administration access
   */
  static canAccessSystemAdmin(userRole: User['role']): ValidationResult {
    if (hasPermission(userRole, Permission.SYSTEM_ADMIN)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      message: 'System administration privileges required',
      code: 'SYSTEM_ADMIN_REQUIRED'
    };
  }

  /**
   * Validate API rate limiting exemption
   */
  static isExemptFromRateLimit(userRole: User['role']): boolean {
    // Administrators are exempt from rate limiting
    return userRole === 'administrator';
  }

  /**
   * Get maximum upload size for role
   */
  static getMaxUploadSize(userRole: User['role']): number {
    // Return size in bytes
    const sizeLimits = {
      'administrator': 100 * 1024 * 1024, // 100MB
      'editor': 50 * 1024 * 1024,         // 50MB
      'read-only': 0                       // No upload
    };

    return sizeLimits[userRole];
  }

  /**
   * Validate file upload permissions
   */
  static canUploadFile(userRole: User['role'], fileSize: number, mimeType: string): ValidationResult {
    // Check upload permission
    if (!hasPermission(userRole, Permission.UPLOAD_DOCUMENT)) {
      return {
        isValid: false,
        message: 'Insufficient permissions to upload files',
        code: 'UPLOAD_PERMISSION_DENIED'
      };
    }

    // Check file size limit
    const maxSize = this.getMaxUploadSize(userRole);
    if (fileSize > maxSize) {
      return {
        isValid: false,
        message: `File size exceeds limit for your role (${maxSize / (1024 * 1024)}MB)`,
        code: 'FILE_SIZE_EXCEEDED'
      };
    }

    // Define allowed MIME types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      return {
        isValid: false,
        message: 'File type not allowed',
        code: 'INVALID_FILE_TYPE'
      };
    }

    return { isValid: true };
  }
}