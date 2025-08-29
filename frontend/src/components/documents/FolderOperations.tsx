import React, { useState, useCallback } from 'react';
import { Button, Modal, Input, ErrorMessage } from '../ui';
import { folderService } from '../../services';
import { Folder } from '../../types';
import './FolderOperations.css';

// Enhanced folder name validation utility
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
const checkFolderPermissions = (folder: Folder | null, currentUserId: string | undefined, operation: 'read' | 'write'): { hasPermission: boolean; message: string } => {
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

interface FolderOperationsProps {
  onFolderCreated?: (folder: Folder) => void;
  onFolderUpdated?: (folder: Folder) => void;
  onFolderDeleted?: (folderId: string) => void;
  onError?: (error: string) => void;
  currentUserId?: string;
}

interface CreateFolderModalProps {
  isOpen: boolean;
  parentId: string | null;
  onClose: () => void;
  onFolderCreated: (folder: Folder) => void;
  onError: (error: string) => void;
  currentUserId?: string;
}

interface EditFolderModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onFolderUpdated: (folder: Folder) => void;
  onError: (error: string) => void;
  currentUserId?: string;
}

interface DeleteFolderModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onFolderDeleted: (folderId: string) => void;
  onError: (error: string) => void;
  currentUserId?: string;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  parentId,
  onClose,
  onFolderCreated,
  onError,
  currentUserId
}) => {
  const [folderName, setFolderName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate folder name
    const nameError = validateFolderName(folderName);
    if (nameError) {
      setValidationError(nameError);
      return;
    }

    // Check permissions if we have a parent folder
    if (parentId && currentUserId) {
      try {
        const parentFolder = await folderService.getFolder(parentId);
        const permissionCheck = checkFolderPermissions(parentFolder, currentUserId, 'write');
        if (!permissionCheck.hasPermission) {
          setPermissionError(permissionCheck.message);
          return;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check folder permissions';
        onError(errorMessage);
        return;
      }
    }

    setIsLoading(true);
    setValidationError(null);
    setPermissionError(null);

    try {
      const folder = await folderService.createFolder({
        name: folderName.trim(),
        parentId,
        isPublic,
        permissions: {
          read: currentUserId ? [currentUserId] : [],
          write: currentUserId ? [currentUserId] : []
        }
      });
      
      onFolderCreated(folder);
      setFolderName('');
      setIsPublic(false);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      // Handle specific error cases
      if (errorMessage.includes('already exists')) {
        setValidationError('A folder with this name already exists in this location');
      } else if (errorMessage.includes('permission')) {
        setPermissionError('You do not have permission to create folders here');
      } else {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [folderName, parentId, isPublic, currentUserId, onFolderCreated, onError, onClose]);

  const handleClose = useCallback(() => {
    setFolderName('');
    setIsPublic(false);
    setValidationError(null);
    setPermissionError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Folder"
      size="md"
    >
      <form onSubmit={handleSubmit} className="folder-form">
        {permissionError && (
          <ErrorMessage
            message={permissionError}
            className="folder-form__error"
          />
        )}
        
        <div className="folder-form__field">
          <label htmlFor="folder-name" className="folder-form__label">
            Folder Name *
          </label>
          <Input
            id="folder-name"
            type="text"
            value={folderName}
            onChange={(e) => {
              setFolderName(e.target.value);
              setValidationError(null);
              setPermissionError(null);
            }}
            placeholder="Enter folder name"
            disabled={isLoading}
            autoFocus
            aria-describedby={validationError ? 'folder-name-error' : undefined}
          />
          {validationError && (
            <ErrorMessage
              message={validationError}
              className="folder-form__error"
            />
          )}
        </div>

        <div className="folder-form__field">
          <label className="folder-form__checkbox">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isLoading}
            />
            <span className="folder-form__checkbox-label">
              Make folder public (visible to website visitors)
            </span>
          </label>
        </div>

        <div className="folder-form__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !folderName.trim()}
            loading={isLoading}
          >
            Create Folder
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const EditFolderModal: React.FC<EditFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
  onFolderUpdated,
  onError,
  currentUserId
}) => {
  const [folderName, setFolderName] = useState(folder?.name || '');
  const [isPublic, setIsPublic] = useState(folder?.isPublic || false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  React.useEffect(() => {
    if (folder) {
      setFolderName(folder.name);
      setIsPublic(folder.isPublic);
      setValidationError(null);
      setPermissionError(null);
      
      // Check if user has permission to edit this folder
      if (currentUserId) {
        const permissionCheck = checkFolderPermissions(folder, currentUserId, 'write');
        if (!permissionCheck.hasPermission) {
          setPermissionError(permissionCheck.message);
        }
      }
    }
  }, [folder, currentUserId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folder) return;

    // Validate folder name
    const nameError = validateFolderName(folderName);
    if (nameError) {
      setValidationError(nameError);
      return;
    }

    // Check permissions
    if (currentUserId) {
      const permissionCheck = checkFolderPermissions(folder, currentUserId, 'write');
      if (!permissionCheck.hasPermission) {
        setPermissionError(permissionCheck.message);
        return;
      }
    }

    setIsLoading(true);
    setValidationError(null);
    setPermissionError(null);

    try {
      const updatedFolder = await folderService.updateFolder(folder.id, {
        name: folderName.trim(),
        isPublic
      });
      
      onFolderUpdated(updatedFolder);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update folder';
      // Handle specific error cases
      if (errorMessage.includes('already exists')) {
        setValidationError('A folder with this name already exists in this location');
      } else if (errorMessage.includes('permission')) {
        setPermissionError('You do not have permission to edit this folder');
      } else {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [folder, folderName, isPublic, currentUserId, onFolderUpdated, onError, onClose]);

  const handleClose = useCallback(() => {
    setValidationError(null);
    setPermissionError(null);
    onClose();
  }, [onClose]);

  if (!folder) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Folder"
      size="md"
    >
      <form onSubmit={handleSubmit} className="folder-form">
        {permissionError && (
          <ErrorMessage
            message={permissionError}
            className="folder-form__error"
          />
        )}
        
        <div className="folder-form__field">
          <label htmlFor="edit-folder-name" className="folder-form__label">
            Folder Name *
          </label>
          <Input
            id="edit-folder-name"
            type="text"
            value={folderName}
            onChange={(e) => {
              setFolderName(e.target.value);
              setValidationError(null);
              setPermissionError(null);
            }}
            placeholder="Enter folder name"
            disabled={isLoading || !!permissionError}
            autoFocus
            aria-describedby={validationError ? 'edit-folder-name-error' : undefined}
          />
          {validationError && (
            <ErrorMessage
              message={validationError}
              className="folder-form__error"
            />
          )}
        </div>

        <div className="folder-form__field">
          <label className="folder-form__checkbox">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isLoading || !!permissionError}
            />
            <span className="folder-form__checkbox-label">
              Make folder public (visible to website visitors)
            </span>
          </label>
        </div>

        <div className="folder-form__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !folderName.trim() || !!permissionError}
            loading={isLoading}
          >
            Update Folder
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
  onFolderDeleted,
  onError,
  currentUserId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [folderStats, setFolderStats] = useState<{ documentCount: number; subfolderCount: number } | null>(null);

  // Load folder statistics and check permissions when modal opens
  React.useEffect(() => {
    if (isOpen && folder && currentUserId) {
      // Check permissions
      const permissionCheck = checkFolderPermissions(folder, currentUserId, 'write');
      if (!permissionCheck.hasPermission) {
        setPermissionError(permissionCheck.message);
      } else {
        setPermissionError(null);
        
        // Load folder statistics
        folderService.getFolderStatistics(folder.id)
          .then(stats => {
            setFolderStats({
              documentCount: stats.documentCount,
              subfolderCount: stats.subfolderCount
            });
          })
          .catch(() => {
            // If we can't get stats, just proceed without them
            setFolderStats({ documentCount: 0, subfolderCount: 0 });
          });
      }
    }
  }, [isOpen, folder, currentUserId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folder || confirmText !== folder.name) return;

    // Final permission check
    if (currentUserId) {
      const permissionCheck = checkFolderPermissions(folder, currentUserId, 'write');
      if (!permissionCheck.hasPermission) {
        setPermissionError(permissionCheck.message);
        return;
      }
    }

    setIsLoading(true);

    try {
      await folderService.deleteFolder(folder.id);
      onFolderDeleted(folder.id);
      setConfirmText('');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
      if (errorMessage.includes('permission')) {
        setPermissionError('You do not have permission to delete this folder');
      } else {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [folder, confirmText, currentUserId, onFolderDeleted, onError, onClose]);

  const handleClose = useCallback(() => {
    setConfirmText('');
    setPermissionError(null);
    setFolderStats(null);
    onClose();
  }, [onClose]);

  if (!folder) return null;

  const isConfirmValid = confirmText === folder.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Folder"
      size="md"
    >
      <div className="folder-delete">
        {permissionError ? (
          <ErrorMessage
            message={permissionError}
            className="folder-form__error"
          />
        ) : (
          <>
            <div className="folder-delete__warning">
              <div className="folder-delete__icon" aria-hidden="true">⚠️</div>
              <div className="folder-delete__content">
                <h4 className="folder-delete__title">Are you sure?</h4>
                <p className="folder-delete__message">
                  This action will permanently delete the folder "<strong>{folder.name}</strong>" 
                  and all its contents. This cannot be undone.
                </p>
                {folderStats && (
                  <div className="folder-delete__stats">
                    <p className="folder-delete__stats-item">
                      📁 <strong>{folderStats.subfolderCount}</strong> subfolder{folderStats.subfolderCount !== 1 ? 's' : ''}
                    </p>
                    <p className="folder-delete__stats-item">
                      📄 <strong>{folderStats.documentCount}</strong> document{folderStats.documentCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="folder-form">
              <div className="folder-form__field">
                <label htmlFor="confirm-folder-name" className="folder-form__label">
                  Type the folder name to confirm deletion:
                </label>
                <Input
                  id="confirm-folder-name"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={folder.name}
                  disabled={isLoading}
                  autoFocus
                />
                <p className="folder-form__help-text">
                  Type "<strong>{folder.name}</strong>" to confirm
                </p>
              </div>

              <div className="folder-form__actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={isLoading || !isConfirmValid}
                  loading={isLoading}
                >
                  Delete Folder
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};

export const useFolderOperations = (props: FolderOperationsProps = {}) => {
  const [createModal, setCreateModal] = useState<{ isOpen: boolean; parentId: string | null }>({
    isOpen: false,
    parentId: null
  });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; folder: Folder | null }>({
    isOpen: false,
    folder: null
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; folder: Folder | null }>({
    isOpen: false,
    folder: null
  });

  const openCreateModal = useCallback((parentId: string | null = null) => {
    setCreateModal({ isOpen: true, parentId });
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModal({ isOpen: false, parentId: null });
  }, []);

  const openEditModal = useCallback((folder: Folder) => {
    setEditModal({ isOpen: true, folder });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModal({ isOpen: false, folder: null });
  }, []);

  const openDeleteModal = useCallback((folder: Folder) => {
    setDeleteModal({ isOpen: true, folder });
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({ isOpen: false, folder: null });
  }, []);

  const modals = (
    <>
      <CreateFolderModal
        isOpen={createModal.isOpen}
        parentId={createModal.parentId}
        onClose={closeCreateModal}
        onFolderCreated={props.onFolderCreated || (() => {})}
        onError={props.onError || (() => {})}
        currentUserId={props.currentUserId}
      />
      <EditFolderModal
        isOpen={editModal.isOpen}
        folder={editModal.folder}
        onClose={closeEditModal}
        onFolderUpdated={props.onFolderUpdated || (() => {})}
        onError={props.onError || (() => {})}
        currentUserId={props.currentUserId}
      />
      <DeleteFolderModal
        isOpen={deleteModal.isOpen}
        folder={deleteModal.folder}
        onClose={closeDeleteModal}
        onFolderDeleted={props.onFolderDeleted || (() => {})}
        onError={props.onError || (() => {})}
        currentUserId={props.currentUserId}
      />
    </>
  );

  return {
    openCreateModal,
    openEditModal,
    openDeleteModal,
    modals
  };
};

export default {
  CreateFolderModal,
  EditFolderModal,
  DeleteFolderModal,
  useFolderOperations
};