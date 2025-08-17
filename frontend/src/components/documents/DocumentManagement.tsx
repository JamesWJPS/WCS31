import React, { useState, useCallback } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import FileUpload from './FileUpload';
import FolderTree from './FolderTree';
import DocumentList from './DocumentList';
import FolderPermissions from './FolderPermissions';
import { useAuth } from '../../contexts/AuthContext';
import { folderService } from '../../services';
import { Folder, Document } from '../../types';
import './DocumentManagement.css';

interface DocumentManagementProps {
  className?: string;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({
  className = '',
}) => {
  const { user } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFolderSelect = useCallback((folder: Folder | null) => {
    setSelectedFolder(folder);
  }, []);

  const handleFolderCreate = useCallback((parentId: string | null) => {
    setNewFolderParentId(parentId);
    setShowCreateFolder(true);
  }, []);

  const handleFolderEdit = useCallback((folder: Folder) => {
    setFolderToEdit(folder);
    setShowPermissions(true);
  }, []);

  const handleFolderDelete = useCallback(async (folder: Folder) => {
    if (window.confirm(`Are you sure you want to delete the folder "${folder.name}"? This action cannot be undone.`)) {
      try {
        await folderService.deleteFolder(folder.id);
        if (selectedFolder?.id === folder.id) {
          setSelectedFolder(null);
        }
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error('Failed to delete folder:', error);
        alert('Failed to delete folder. Please try again.');
      }
    }
  }, [selectedFolder]);

  const handleCreateFolderSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const isPublic = formData.get('isPublic') === 'on';

    if (!name.trim()) {
      alert('Please enter a folder name');
      return;
    }

    try {
      await folderService.createFolder({
        name: name.trim(),
        parentId: newFolderParentId,
        isPublic,
      });
      
      setShowCreateFolder(false);
      setNewFolderParentId(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  }, [newFolderParentId]);

  const handleUploadComplete = useCallback((documents: Document[]) => {
    console.log('Upload completed:', documents);
    setRefreshKey(prev => prev + 1);
  }, []);

  const handlePermissionsUpdated = useCallback((folder: Folder) => {
    if (selectedFolder?.id === folder.id) {
      setSelectedFolder(folder);
    }
    setRefreshKey(prev => prev + 1);
  }, [selectedFolder]);

  const handleDocumentEdit = useCallback((document: Document) => {
    // TODO: Implement document editing modal
    console.log('Edit document:', document);
  }, []);

  const handleDocumentDelete = useCallback(async (document: Document) => {
    if (window.confirm(`Are you sure you want to delete "${document.originalName}"? This action cannot be undone.`)) {
      try {
        // TODO: Implement document deletion
        console.log('Delete document:', document);
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error('Failed to delete document:', error);
        alert('Failed to delete document. Please try again.');
      }
    }
  }, []);

  const handleDocumentMove = useCallback((document: Document) => {
    // TODO: Implement document move modal
    console.log('Move document:', document);
  }, []);

  const handleBulkAction = useCallback((action: 'move' | 'delete' | 'download', documents: Document[]) => {
    // TODO: Implement bulk actions
    console.log('Bulk action:', action, documents);
  }, []);

  const canUpload = user?.role !== 'read-only' && selectedFolder;
  const canCreateFolder = user?.role !== 'read-only';

  return (
    <div className={`document-management ${className}`}>
      <div className="document-management__header">
        <h2 className="document-management__title">Document Management</h2>
        <div className="document-management__actions">
          {canCreateFolder && (
            <Button
              onClick={() => handleFolderCreate(null)}
              variant="secondary"
            >
              📁 New Folder
            </Button>
          )}
          {canUpload && (
            <Button
              onClick={() => setShowUpload(true)}
            >
              📤 Upload Files
            </Button>
          )}
        </div>
      </div>

      <div className="document-management__content">
        <div className="document-management__sidebar">
          <FolderTree
            key={refreshKey}
            selectedFolderId={selectedFolder?.id}
            onFolderSelect={handleFolderSelect}
            onFolderCreate={handleFolderCreate}
            onFolderEdit={handleFolderEdit}
            onFolderDelete={handleFolderDelete}
            showActions={user?.role !== 'read-only'}
            showCreateRoot={canCreateFolder}
          />
        </div>

        <div className="document-management__main">
          <div className="document-management__main-header">
            <h3 className="document-management__folder-title">
              {selectedFolder ? selectedFolder.name : 'All Documents'}
            </h3>
            {selectedFolder && user?.role !== 'read-only' && (
              <div className="document-management__folder-actions">
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setShowPermissions(true)}
                  title="Manage permissions"
                >
                  🔒 Permissions
                </Button>
                {canUpload && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setShowUpload(true)}
                    title="Upload files to this folder"
                  >
                    📤 Upload
                  </Button>
                )}
              </div>
            )}
          </div>

          <DocumentList
            key={`${refreshKey}-${selectedFolder?.id || 'all'}`}
            folderId={selectedFolder?.id}
            onDocumentEdit={user?.role !== 'read-only' ? handleDocumentEdit : undefined}
            onDocumentDelete={user?.role !== 'read-only' ? handleDocumentDelete : undefined}
            onDocumentMove={user?.role !== 'read-only' ? handleDocumentMove : undefined}
            onBulkAction={user?.role !== 'read-only' ? handleBulkAction : undefined}
            showActions={true}
            selectable={user?.role !== 'read-only'}
          />
        </div>
      </div>

      {/* Create Folder Modal */}
      <Modal
        isOpen={showCreateFolder}
        onClose={() => {
          setShowCreateFolder(false);
          setNewFolderParentId(null);
        }}
        title="Create New Folder"
      >
        <form onSubmit={handleCreateFolderSubmit} className="document-management__create-form">
          <div className="document-management__form-field">
            <label htmlFor="folder-name">Folder Name</label>
            <input
              id="folder-name"
              name="name"
              type="text"
              required
              placeholder="Enter folder name"
              className="document-management__form-input"
            />
          </div>
          
          <div className="document-management__form-field">
            <label className="document-management__checkbox-label">
              <input
                name="isPublic"
                type="checkbox"
                className="document-management__checkbox"
              />
              <span>Make this folder public</span>
            </label>
            <p className="document-management__form-help">
              Public folders are visible to website visitors
            </p>
          </div>

          <div className="document-management__form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateFolder(false);
                setNewFolderParentId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Folder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal */}
      {showUpload && selectedFolder && (
        <Modal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          title={`Upload Files to ${selectedFolder.name}`}
        >
          <FileUpload
            folderId={selectedFolder.id}
            onUploadComplete={(documents) => {
              handleUploadComplete(documents);
              setShowUpload(false);
            }}
            onUploadError={(error) => {
              console.error('Upload error:', error);
            }}
            multiple={true}
          />
        </Modal>
      )}

      {/* Permissions Modal */}
      {showPermissions && (selectedFolder || folderToEdit) && (
        <FolderPermissions
          folder={folderToEdit || selectedFolder!}
          isOpen={showPermissions}
          onClose={() => {
            setShowPermissions(false);
            setFolderToEdit(null);
          }}
          onPermissionsUpdated={handlePermissionsUpdated}
        />
      )}
    </div>
  );
};

export default DocumentManagement;