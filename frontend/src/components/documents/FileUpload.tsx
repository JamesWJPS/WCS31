import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { documentService } from '../../services';
import { Document, UploadProgress } from '../../types';
import './FileUpload.css';

interface FileUploadProps {
  folderId: string;
  onUploadComplete?: (documents: Document[]) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  folderId,
  onUploadComplete,
  onUploadError,
  multiple = true,
  acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
  ],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`;
    }
    return null;
  }, [acceptedTypes, maxFileSize]);

  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate files
    fileArray.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    if (validFiles.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);

    // Initialize progress tracking
    const initialProgress: UploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    setUploadProgress(initialProgress);

    try {
      const uploadedDocuments: Document[] = [];

      if (multiple && validFiles.length > 1) {
        // Bulk upload
        setUploadProgress(prev => prev.map(p => ({ ...p, status: 'uploading' as const })));
        
        const documents = await documentService.uploadBulkDocuments(validFiles, folderId);
        uploadedDocuments.push(...documents);
        
        setUploadProgress(prev => prev.map(p => ({ 
          ...p, 
          progress: 100, 
          status: 'completed' as const 
        })));
      } else {
        // Single file uploads
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          
          setUploadProgress(prev => prev.map((p, index) => 
            index === i ? { ...p, status: 'uploading' as const } : p
          ));

          try {
            const document = await documentService.uploadDocument(file, folderId);
            uploadedDocuments.push(document);
            
            setUploadProgress(prev => prev.map((p, index) => 
              index === i ? { ...p, progress: 100, status: 'completed' as const } : p
            ));
          } catch (fileError) {
            setUploadProgress(prev => prev.map((p, index) => 
              index === i ? { 
                ...p, 
                status: 'error' as const, 
                error: fileError instanceof Error ? fileError.message : 'Upload failed'
              } : p
            ));
          }
        }
      }

      if (uploadedDocuments.length > 0) {
        onUploadComplete?.(uploadedDocuments);
      }

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
      
      setUploadProgress(prev => prev.map(p => ({ 
        ...p, 
        status: 'error' as const, 
        error: errorMessage 
      })));
    } finally {
      setIsUploading(false);
    }
  }, [folderId, multiple, validateFile, onUploadComplete, onUploadError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`file-upload ${className}`}>
      <div
        className={`file-upload__dropzone ${isDragOver ? 'file-upload__dropzone--drag-over' : ''} ${isUploading ? 'file-upload__dropzone--uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="File upload area"
        onClick={handleBrowseClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="file-upload__input"
          aria-hidden="true"
        />

        <div className="file-upload__content">
          {isUploading ? (
            <div className="file-upload__uploading">
              <LoadingSpinner size="large" />
              <p>Uploading files...</p>
            </div>
          ) : (
            <>
              <div className="file-upload__icon" aria-hidden="true">
                📁
              </div>
              <h3 className="file-upload__title">
                {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
              </h3>
              <p className="file-upload__subtitle">
                or <Button variant="link" onClick={handleBrowseClick}>browse files</Button>
              </p>
              <div className="file-upload__info">
                <p>Supported formats: {acceptedTypes.map(type => type.split('/')[1]).join(', ')}</p>
                <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
          className="file-upload__error"
        />
      )}

      {uploadProgress.length > 0 && (
        <div className="file-upload__progress">
          <h4>Upload Progress</h4>
          {uploadProgress.map((progress, index) => (
            <div key={index} className="file-upload__progress-item">
              <div className="file-upload__progress-info">
                <span className="file-upload__progress-filename">
                  {progress.file.name}
                </span>
                <span className="file-upload__progress-size">
                  {formatFileSize(progress.file.size)}
                </span>
                <span className={`file-upload__progress-status file-upload__progress-status--${progress.status}`}>
                  {progress.status === 'completed' && '✓'}
                  {progress.status === 'error' && '✗'}
                  {progress.status === 'uploading' && <LoadingSpinner size="small" />}
                  {progress.status === 'pending' && '⏳'}
                </span>
              </div>
              {progress.status === 'uploading' && (
                <div className="file-upload__progress-bar">
                  <div 
                    className="file-upload__progress-fill"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
              {progress.error && (
                <div className="file-upload__progress-error">
                  {progress.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;