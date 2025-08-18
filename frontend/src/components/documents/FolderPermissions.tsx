import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { folderService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { Folder, User } from '../../types';
import './FolderPermissions.css';

interface FolderPermissionsProps {
  folder: Folder;
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated?: (folder: Folder) => void;
  className?: string;
}

interface UserPermission {
  userId: string;
  username: string;
  email: string;
  role: 'administrator' | 'editor' | 'read-only';
  permission: 'read' | 'write' | 'none';
}

const FolderPermissions: React.FC<FolderPermissionsProps> = ({
  folder,
  isOpen,
  onClose,
  onPermissionsUpdated,
  className = '',
}) => {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(folder.isPublic);
  const [hasChanges, setHasChanges] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real implementation, you would fetch users from a user service
      // For now, we'll simulate this with the current user
      const users: User[] = [
        {
          id: user?.id || 'current-user',
          username: user?.username || 'current-user',
          email: user?.email || 'user@example.com',
          role: user?.role || 'editor',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isActive: true,
        }
      ];
      
      setAvailableUsers(users);
      
      // Create user permissions based on folder permissions
      const permissions: UserPermission[] = users.map(u => {
        let permission: 'read' | 'write' | 'none' = 'none';
        
        if (folder.permissions.write.includes(u.id)) {
          permission = 'write';
        } else if (folder.permissions.read.includes(u.id)) {
          permission = 'read';
        }
        
        return {
          userId: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          permission,
        };
      });
      
      setUserPermissions(permissions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [folder.permissions, user]);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setIsPublic(folder.isPublic);
      setHasChanges(false);
    }
  }, [isOpen, loadUsers, folder.isPublic]);

  const handlePermissionChange = useCallback((userId: string, permission: 'read' | 'write' | 'none') => {
    setUserPermissions(prev => 
      prev.map(up => 
        up.userId === userId ? { ...up, permission } : up
      )
    );
    setHasChanges(true);
  }, []);

  const handlePublicToggle = useCallback((newIsPublic: boolean) => {
    setIsPublic(newIsPublic);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Build permissions from user permissions
      const readUsers = userPermissions
        .filter(up => up.permission === 'read' || up.permission === 'write')
        .map(up => up.userId);
      
      const writeUsers = userPermissions
        .filter(up => up.permission === 'write')
        .map(up => up.userId);

      const updatedFolder = await folderService.updateFolder(folder.id, {
        isPublic,
        permissions: {
          read: readUsers,
          write: writeUsers,
        },
      });

      onPermissionsUpdated?.(updatedFolder);
      setHasChanges(false);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update permissions';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [folder.id, isPublic, userPermissions, onPermissionsUpdated, onClose]);

  const handleCancel = useCallback(() => {
    setIsPublic(folder.isPublic);
    setHasChanges(false);
    setError(null);
    onClose();
  }, [folder.isPublic, onClose]);

  const canManagePermissions = user?.role === 'administrator' || folder.createdBy === user?.id;

  if (!canManagePermissions) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Folder Permissions">
        <div className="folder-permissions__no-access">
          <p>You don't have permission to manage this folder's permissions.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCancel} 
      title={`Permissions: ${folder.name}`}
      className={className}
    >
      <div className="folder-permissions">
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => setError(null)}
            className="folder-permissions__error"
          />
        )}

        {isLoading ? (
          <div className="folder-permissions__loading">
            <LoadingSpinner />
            <p>Loading permissions...</p>
          </div>
        ) : (
          <>
            {/* Public/Private Toggle */}
            <div className="folder-permissions__section">
              <h3 className="folder-permissions__section-title">Folder Visibility</h3>
              <div className="folder-permissions__public-toggle">
                <label className="folder-permissions__toggle-label">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => handlePublicToggle(e.target.checked)}
                    className="folder-permissions__checkbox"
                  />
                  <span className="folder-permissions__toggle-text">
                    {isPublic ? '🌐 Public' : '🔒 Private'}
                  </span>
                </label>
                <p className="folder-permissions__toggle-description">
                  {isPublic 
                    ? 'This folder and its contents are visible to website visitors'
                    : 'This folder is only accessible to users with specific permissions'
                  }
                </p>
              </div>
            </div>

            {/* User Permissions */}
            <div className="folder-permissions__section">
              <h3 className="folder-permissions__section-title">User Permissions</h3>
              
              {userPermissions.length === 0 ? (
                <p className="folder-permissions__no-users">No users found</p>
              ) : (
                <div className="folder-permissions__users">
                  {userPermissions.map((userPerm) => (
                    <div key={userPerm.userId} className="folder-permissions__user">
                      <div className="folder-permissions__user-info">
                        <div className="folder-permissions__user-name">
                          {userPerm.username}
                        </div>
                        <div className="folder-permissions__user-details">
                          {userPerm.email} • {userPerm.role}
                        </div>
                      </div>
                      
                      <Select
                        value={userPerm.permission}
                        onChange={(e) => handlePermissionChange(userPerm.userId, e.target.value as 'read' | 'write' | 'none')}
                        className="folder-permissions__permission-select"
                        aria-label={`Permission for ${userPerm.username}`}
                      >
                        <option value="none">No Access</option>
                        <option value="read">Read Only</option>
                        <option value="write">Read & Write</option>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permission Explanations */}
            <div className="folder-permissions__section">
              <h4 className="folder-permissions__help-title">Permission Levels</h4>
              <div className="folder-permissions__help">
                <div className="folder-permissions__help-item">
                  <strong>No Access:</strong> User cannot see or access this folder
                </div>
                <div className="folder-permissions__help-item">
                  <strong>Read Only:</strong> User can view and download documents
                </div>
                <div className="folder-permissions__help-item">
                  <strong>Read & Write:</strong> User can view, download, upload, and manage documents
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="folder-permissions__actions">
          <Button 
            onClick={handleCancel}
            variant="secondary"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="small" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FolderPermissions;