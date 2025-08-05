import { RoleValidator, ROLE_HIERARCHY } from '../../utils/roleValidation';

describe('RoleValidator', () => {
  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(RoleValidator.isValidRole('administrator')).toBe(true);
      expect(RoleValidator.isValidRole('editor')).toBe(true);
      expect(RoleValidator.isValidRole('read-only')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(RoleValidator.isValidRole('invalid')).toBe(false);
      expect(RoleValidator.isValidRole('admin')).toBe(false);
      expect(RoleValidator.isValidRole('')).toBe(false);
    });
  });

  describe('canAssignRole', () => {
    it('should allow administrator to assign any role', () => {
      const result1 = RoleValidator.canAssignRole('administrator', 'editor');
      const result2 = RoleValidator.canAssignRole('administrator', 'read-only');
      const result3 = RoleValidator.canAssignRole('administrator', 'administrator');

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
    });

    it('should reject non-administrator from assigning roles', () => {
      const result1 = RoleValidator.canAssignRole('editor', 'read-only');
      const result2 = RoleValidator.canAssignRole('read-only', 'editor');

      expect(result1.isValid).toBe(false);
      expect(result1.code).toBe('INSUFFICIENT_PRIVILEGES');
      expect(result2.isValid).toBe(false);
      expect(result2.code).toBe('INSUFFICIENT_PRIVILEGES');
    });

    it('should reject invalid target role', () => {
      const result = RoleValidator.canAssignRole('administrator', 'invalid' as any);

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_ROLE');
    });
  });

  describe('canModifyUser', () => {
    it('should allow users to modify their own profile', () => {
      const result1 = RoleValidator.canModifyUser('read-only', 'administrator', true);
      const result2 = RoleValidator.canModifyUser('editor', 'administrator', true);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should allow administrator to modify other users', () => {
      const result1 = RoleValidator.canModifyUser('administrator', 'editor', false);
      const result2 = RoleValidator.canModifyUser('administrator', 'read-only', false);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should reject non-administrator from modifying other users', () => {
      const result1 = RoleValidator.canModifyUser('editor', 'read-only', false);
      const result2 = RoleValidator.canModifyUser('read-only', 'editor', false);

      expect(result1.isValid).toBe(false);
      expect(result1.code).toBe('INSUFFICIENT_PRIVILEGES');
      expect(result2.isValid).toBe(false);
      expect(result2.code).toBe('INSUFFICIENT_PRIVILEGES');
    });
  });

  describe('canDeleteUser', () => {
    it('should allow administrator to delete other users', () => {
      const result1 = RoleValidator.canDeleteUser('administrator', 'editor', false);
      const result2 = RoleValidator.canDeleteUser('administrator', 'read-only', false);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should reject users from deleting their own account', () => {
      const result1 = RoleValidator.canDeleteUser('administrator', 'administrator', true);
      const result2 = RoleValidator.canDeleteUser('editor', 'editor', true);

      expect(result1.isValid).toBe(false);
      expect(result1.code).toBe('SELF_DELETE_FORBIDDEN');
      expect(result2.isValid).toBe(false);
      expect(result2.code).toBe('SELF_DELETE_FORBIDDEN');
    });

    it('should reject non-administrator from deleting users', () => {
      const result1 = RoleValidator.canDeleteUser('editor', 'read-only', false);
      const result2 = RoleValidator.canDeleteUser('read-only', 'editor', false);

      expect(result1.isValid).toBe(false);
      expect(result1.code).toBe('INSUFFICIENT_PRIVILEGES');
      expect(result2.isValid).toBe(false);
      expect(result2.code).toBe('INSUFFICIENT_PRIVILEGES');
    });
  });

  describe('canAccessContent', () => {
    it('should allow all users to access published content', () => {
      const result1 = RoleValidator.canAccessContent('read-only', 'published', false);
      const result2 = RoleValidator.canAccessContent('editor', 'published', false);
      const result3 = RoleValidator.canAccessContent('administrator', 'published', false);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
    });

    it('should allow content owner to access draft/archived content', () => {
      const result1 = RoleValidator.canAccessContent('read-only', 'draft', true);
      const result2 = RoleValidator.canAccessContent('editor', 'archived', true);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should allow editors to access any draft/archived content', () => {
      const result1 = RoleValidator.canAccessContent('editor', 'draft', false);
      const result2 = RoleValidator.canAccessContent('administrator', 'archived', false);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should reject read-only users from accessing non-published content they do not own', () => {
      const result1 = RoleValidator.canAccessContent('read-only', 'draft', false);
      const result2 = RoleValidator.canAccessContent('read-only', 'archived', false);

      expect(result1.isValid).toBe(false);
      expect(result1.code).toBe('CONTENT_ACCESS_DENIED');
      expect(result2.isValid).toBe(false);
      expect(result2.code).toBe('CONTENT_ACCESS_DENIED');
    });
  });

  describe('canAccessDocument', () => {
    it('should allow all users to access public documents', () => {
      const result1 = RoleValidator.canAccessDocument('read-only', true, false);
      const result2 = RoleValidator.canAccessDocument('editor', true, false);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should allow users with explicit access to private documents', () => {
      const result1 = RoleValidator.canAccessDocument('read-only', false, true);
      const result2 = RoleValidator.canAccessDocument('editor', false, true);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should allow users with document permissions to access private documents', () => {
      const result1 = RoleValidator.canAccessDocument('editor', false, false);
      const result2 = RoleValidator.canAccessDocument('administrator', false, false);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should reject read-only users from accessing private documents without explicit access', () => {
      const result = RoleValidator.canAccessDocument('read-only', false, false);

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('DOCUMENT_ACCESS_DENIED');
    });
  });

  describe('canManageFolderPermissions', () => {
    it('should allow folder owner to manage permissions', () => {
      const result = RoleValidator.canManageFolderPermissions('read-only', true);

      expect(result.isValid).toBe(true);
    });

    it('should allow users with folder permission management rights', () => {
      const result1 = RoleValidator.canManageFolderPermissions('editor', false);
      const result2 = RoleValidator.canManageFolderPermissions('administrator', false);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should reject read-only users who are not folder owners', () => {
      const result = RoleValidator.canManageFolderPermissions('read-only', false);

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('FOLDER_PERMISSION_DENIED');
    });
  });

  describe('canAccessTemplate', () => {
    it('should allow all users to read templates', () => {
      const result1 = RoleValidator.canAccessTemplate('read-only', 'read');
      const result2 = RoleValidator.canAccessTemplate('editor', 'read');
      const result3 = RoleValidator.canAccessTemplate('administrator', 'read');

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
    });

    it('should allow only administrators to create/update/delete templates', () => {
      const result1 = RoleValidator.canAccessTemplate('administrator', 'create');
      const result2 = RoleValidator.canAccessTemplate('administrator', 'update');
      const result3 = RoleValidator.canAccessTemplate('administrator', 'delete');

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
    });

    it('should reject non-administrators from template management operations', () => {
      const result1 = RoleValidator.canAccessTemplate('editor', 'create');
      const result2 = RoleValidator.canAccessTemplate('read-only', 'update');
      const result3 = RoleValidator.canAccessTemplate('editor', 'delete');

      expect(result1.isValid).toBe(false);
      expect(result1.code).toBe('TEMPLATE_ACCESS_DENIED');
      expect(result2.isValid).toBe(false);
      expect(result2.code).toBe('TEMPLATE_ACCESS_DENIED');
      expect(result3.isValid).toBe(false);
      expect(result3.code).toBe('TEMPLATE_ACCESS_DENIED');
    });
  });

  describe('getRoleLevel and hasHigherPrivileges', () => {
    it('should return correct role hierarchy levels', () => {
      expect(RoleValidator.getRoleLevel('read-only')).toBe(1);
      expect(RoleValidator.getRoleLevel('editor')).toBe(2);
      expect(RoleValidator.getRoleLevel('administrator')).toBe(3);
    });

    it('should correctly compare role privileges', () => {
      expect(RoleValidator.hasHigherPrivileges('administrator', 'editor')).toBe(true);
      expect(RoleValidator.hasHigherPrivileges('editor', 'read-only')).toBe(true);
      expect(RoleValidator.hasHigherPrivileges('administrator', 'read-only')).toBe(true);
      
      expect(RoleValidator.hasHigherPrivileges('editor', 'administrator')).toBe(false);
      expect(RoleValidator.hasHigherPrivileges('read-only', 'editor')).toBe(false);
      expect(RoleValidator.hasHigherPrivileges('editor', 'editor')).toBe(false);
    });
  });

  describe('canPerformBulkOperation', () => {
    it('should allow administrators to perform any bulk operation', () => {
      const result1 = RoleValidator.canPerformBulkOperation('administrator', 'delete', 'content');
      const result2 = RoleValidator.canPerformBulkOperation('administrator', 'update', 'user');
      const result3 = RoleValidator.canPerformBulkOperation('administrator', 'delete', 'document');

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
    });

    it('should allow editors to perform content and document bulk operations', () => {
      const result1 = RoleValidator.canPerformBulkOperation('editor', 'update', 'content');
      const result2 = RoleValidator.canPerformBulkOperation('editor', 'delete', 'document');

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should reject editors from user bulk operations', () => {
      const result = RoleValidator.canPerformBulkOperation('editor', 'delete', 'user');

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('BULK_OPERATION_DENIED');
    });

    it('should reject read-only users from all bulk operations', () => {
      const result1 = RoleValidator.canPerformBulkOperation('read-only', 'update', 'content');
      const result2 = RoleValidator.canPerformBulkOperation('read-only', 'delete', 'document');

      expect(result1.isValid).toBe(false);
      expect(result1.code).toBe('BULK_OPERATION_DENIED');
      expect(result2.isValid).toBe(false);
      expect(result2.code).toBe('BULK_OPERATION_DENIED');
    });

    it('should reject invalid bulk operations', () => {
      const result = RoleValidator.canPerformBulkOperation('administrator', 'invalid' as any, 'content');

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_BULK_OPERATION');
    });
  });

  describe('canAccessSystemAdmin', () => {
    it('should allow administrator to access system admin', () => {
      const result = RoleValidator.canAccessSystemAdmin('administrator');

      expect(result.isValid).toBe(true);
    });

    it('should reject non-administrators from system admin access', () => {
      const result1 = RoleValidator.canAccessSystemAdmin('editor');
      const result2 = RoleValidator.canAccessSystemAdmin('read-only');

      expect(result1.isValid).toBe(false);
      expect(result1.code).toBe('SYSTEM_ADMIN_REQUIRED');
      expect(result2.isValid).toBe(false);
      expect(result2.code).toBe('SYSTEM_ADMIN_REQUIRED');
    });
  });

  describe('isExemptFromRateLimit', () => {
    it('should exempt administrators from rate limiting', () => {
      expect(RoleValidator.isExemptFromRateLimit('administrator')).toBe(true);
    });

    it('should not exempt non-administrators from rate limiting', () => {
      expect(RoleValidator.isExemptFromRateLimit('editor')).toBe(false);
      expect(RoleValidator.isExemptFromRateLimit('read-only')).toBe(false);
    });
  });

  describe('getMaxUploadSize', () => {
    it('should return correct upload size limits for each role', () => {
      expect(RoleValidator.getMaxUploadSize('administrator')).toBe(100 * 1024 * 1024); // 100MB
      expect(RoleValidator.getMaxUploadSize('editor')).toBe(50 * 1024 * 1024);         // 50MB
      expect(RoleValidator.getMaxUploadSize('read-only')).toBe(0);                     // No upload
    });
  });

  describe('canUploadFile', () => {
    it('should allow administrators to upload large files', () => {
      const result = RoleValidator.canUploadFile('administrator', 50 * 1024 * 1024, 'application/pdf');

      expect(result.isValid).toBe(true);
    });

    it('should allow editors to upload files within size limit', () => {
      const result = RoleValidator.canUploadFile('editor', 25 * 1024 * 1024, 'application/pdf');

      expect(result.isValid).toBe(true);
    });

    it('should reject editors from uploading oversized files', () => {
      const result = RoleValidator.canUploadFile('editor', 75 * 1024 * 1024, 'application/pdf');

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('FILE_SIZE_EXCEEDED');
    });

    it('should reject read-only users from uploading any files', () => {
      const result = RoleValidator.canUploadFile('read-only', 1024, 'application/pdf');

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('UPLOAD_PERMISSION_DENIED');
    });

    it('should reject invalid file types', () => {
      const result = RoleValidator.canUploadFile('administrator', 1024, 'application/x-executable');

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_FILE_TYPE');
    });

    it('should allow valid file types', () => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'text/plain',
        'image/jpeg',
        'image/png'
      ];

      validTypes.forEach(mimeType => {
        const result = RoleValidator.canUploadFile('editor', 1024, mimeType);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('ROLE_HIERARCHY', () => {
    it('should define hierarchy for all roles', () => {
      expect(ROLE_HIERARCHY['read-only']).toBeDefined();
      expect(ROLE_HIERARCHY.editor).toBeDefined();
      expect(ROLE_HIERARCHY.administrator).toBeDefined();
    });

    it('should have correct hierarchy order', () => {
      expect(ROLE_HIERARCHY['read-only']).toBeLessThan(ROLE_HIERARCHY.editor);
      expect(ROLE_HIERARCHY.editor).toBeLessThan(ROLE_HIERARCHY.administrator);
    });
  });
});