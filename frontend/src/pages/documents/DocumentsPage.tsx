import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './DocumentsPage.css';

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

  if (!user) {
    return (
      <div className="documents-page__unauthorized">
        <h1>Access Denied</h1>
        <p>You must be logged in to access document management.</p>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1>Document Management</h1>
        <p className="page-description">
          Upload, organize, and manage files and documents. Control file access and organize your media library.
        </p>
      </div>
      
      <div className="documents-content">
        <div className="documents-actions mb-3">
          <button 
            className="btn btn-primary me-2"
            onClick={() => setShowUploadModal(true)}
          >
            <i className="bi bi-upload me-2"></i>
            Upload Files
          </button>
          <button 
            className="btn btn-outline-primary"
            onClick={() => setShowFolderModal(true)}
          >
            <i className="bi bi-folder-plus me-2"></i>
            New Folder
          </button>
        </div>
        
        <div className="row">
          <div className="col-md-3">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Folders</h6>
              </div>
              <div className="card-body">
                <div className="folder-tree">
                  <div className="folder-item">
                    <i className="bi bi-folder me-2"></i>
                    Root Folder
                  </div>
                  <div className="folder-item ms-3">
                    <i className="bi bi-folder me-2"></i>
                    Images
                  </div>
                  <div className="folder-item ms-3">
                    <i className="bi bi-folder me-2"></i>
                    Documents
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-9">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Files</h6>
              </div>
              <div className="card-body">
                <div className="empty-state text-center py-5">
                  <i className="bi bi-folder2-open display-1 text-muted"></i>
                  <h5>No Files Found</h5>
                  <p className="text-muted">Upload files to get started with document management.</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <i className="bi bi-upload me-2"></i>
                    Upload Files
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Files Modal */}
      {showUploadModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Files</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowUploadModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Select Files</label>
                  <input
                    type="file"
                    className="form-control"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                  />
                  <div className="form-text">
                    You can select multiple files to upload at once.
                  </div>
                </div>
                
                {uploadFiles && uploadFiles.length > 0 && (
                  <div className="mb-3">
                    <h6>Selected Files:</h6>
                    <ul className="list-group">
                      {Array.from(uploadFiles).map((file, index) => (
                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>
                            <i className="bi bi-file-earmark me-2"></i>
                            {file.name}
                          </span>
                          <small className="text-muted">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </small>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  disabled={!uploadFiles || uploadFiles.length === 0}
                >
                  Upload Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Folder</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowFolderModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Folder Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowFolderModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  disabled={!newFolderName.trim()}
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;