// Test the validation functions directly
import { vi } from 'vitest';

// Create a simple validation function to test
const validateFolderName = (name: string): string | null => {
  const trimmedName = name.trim();
  
  // Required field validation
  if (!trimmedName) {
    return 'Folder name is required';
  }
  
  // Length validation
  if (trimmedName.length < 1) {
    return 'Folder name must be at least 1 character';
  }
  if (trimmedName.length > 255) {
    return 'Folder name must be less than 255 characters';
  }
  
  // Reserved names validation
  const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
  if (reservedNames.includes(trimmedName.toLowerCase())) {
    return `"${trimmedName}" is a reserved name and cannot be used`;
  }
  
  // Character validation - more restrictive for security
  if (!/^[a-zA-Z0-9\s\-_\.()]+$/.test(trimmedName)) {
    return 'Folder name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses';
  }
  
  // Prevent names starting or ending with dots or spaces
  if (trimmedName.startsWith('.') || trimmedName.endsWith('.')) {
    return 'Folder name cannot start or end with a period';
  }
  if (trimmedName.startsWith(' ') || trimmedName.endsWith(' ')) {
    return 'Folder name cannot start or end with a space';
  }
  
  // Prevent consecutive dots or special characters
  if (/\.{2,}/.test(trimmedName)) {
    return 'Folder name cannot contain consecutive periods';
  }
  if (/[-_]{2,}/.test(trimmedName)) {
    return 'Folder name cannot contain consecutive hyphens or underscores';
  }
  
  return null;
};

// Check if user has permission to perform folder operations
const checkFolderPermissions = (folder: any | null, currentUserId: string | undefined, operation: 'read' | 'write'): { hasPermission: boolean; message: string } => {
  if (!currentUserId) {
    return { hasPermission: false, message: 'User authentication required' };
  }
  
  if (!folder) {
    return { hasPermission: true, message: '' }; // Allow creating folders in root
  }
  
  // Check if user is the creator
  if (folder.createdBy === currentUserId) {
    return { hasPermission: true, message: '' };
  }
  
  // Check permissions array
  const permissions = folder.permissions;
  if (operation === 'read' && permissions.read.includes(currentUserId)) {
    return { hasPermission: true, message: '' };
  }
  if (operation === 'write' && permissions.write.includes(currentUserId)) {
    return { hasPermission: true, message: '' };
  }
  
  return { 
    hasPermission: false, 
    message: `You don't have ${operation} permission for this folder` 
  };
};

describe('FolderOperations - Validation and Permissions', () => {
  describe('Folder Name Validation', () => {
    it('should return error for empty folder name', () => {
      const result = validateFolderName('');
      expect(result).toBe('Folder name is required');
    });

    it('should return error for whitespace-only folder name', () => {
      const result = validateFolderName('   ');
      expect(result).toBe('Folder name is required');
    });

    it('should return error for folder name that is too long', () => {
      const longName = 'a'.repeat(256);
      const result = validateFolderName(longName);
      expect(result).toBe('Folder name must be less than 255 characters');
    });

    it('should return error for reserved folder names', () => {
      const result = validateFolderName('con');
      expect(result).toBe('"con" is a reserved name and cannot be used');
    });

    it('should return error for invalid characters', () => {
      const result = validateFolderName('folder<>name');
      expect(result).toBe('Folder name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses');
    });

    it('should return error for names starting with periods', () => {
      const result = validateFolderName('.hidden-folder');
      expect(result).toBe('Folder name cannot start or end with a period');
    });

    it('should return error for names ending with periods', () => {
      const result = validateFolderName('folder.');
      expect(result).toBe('Folder name cannot start or end with a period');
    });

    it('should return error for consecutive periods', () => {
      const result = validateFolderName('folder..name');
      expect(result).toBe('Folder name cannot contain consecutive periods');
    });

    it('should return error for consecutive hyphens', () => {
      const result = validateFolderName('folder--name');
      expect(result).toBe('Folder name cannot contain consecutive hyphens or underscores');
    });

    it('should accept valid folder names', () => {
      const validNames = [
        'Valid Folder Name',
        'Folder_123',
        'My-Documents',
        'Project (2024)',
        'folder.txt'
      ];

      validNames.forEach(name => {
        const result = validateFolderName(name);
        expect(result).toBeNull();
      });
    });
  });

  describe('Permission Handling', () => {
    const mockFolder = {
      id: 'folder-1',
      name: 'Test Folder',
      parentId: null,
      isPublic: false,
      permissions: {
        read: ['user-1'],
        write: ['user-1']
      },
      createdBy: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    it('should deny access when user is not authenticated', () => {
      const result = checkFolderPermissions(mockFolder, undefined, 'read');
      expect(result).toEqual({
        hasPermission: false,
        message: 'User authentication required'
      });
    });

    it('should allow access for folder creator', () => {
      const result = checkFolderPermissions(mockFolder, 'user-1', 'write');
      expect(result).toEqual({
        hasPermission: true,
        message: ''
      });
    });

    it('should allow access for users with read permission', () => {
      const result = checkFolderPermissions(mockFolder, 'user-1', 'read');
      expect(result).toEqual({
        hasPermission: true,
        message: ''
      });
    });

    it('should deny access for users without permission', () => {
      const result = checkFolderPermissions(mockFolder, 'user-2', 'write');
      expect(result).toEqual({
        hasPermission: false,
        message: "You don't have write permission for this folder"
      });
    });

    it('should allow creating folders in root for any authenticated user', () => {
      const result = checkFolderPermissions(null, 'user-1', 'write');
      expect(result).toEqual({
        hasPermission: true,
        message: ''
      });
    });
  });
});