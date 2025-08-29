import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { documentService } from '../../services';
import { Document, UploadProgress } from '../../types';
import './FileUpload.css';

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'document' | 'other';
}

interface RetryableError {
  message: string;
  isRetryable: boolean;
  retryCount: number;
  maxRetries: number;
}

interface FileUploadProps {
  folderId: string;
  onUploadComplete?: (documents: Document[]) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  className?: string;
  showPreviews?: boolean;
  maxRetries?: number;
  retryDelay?: number; // in milliseconds
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
  showPreviews = true,
  maxRetries = 3,
  retryDelay = 1000,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<RetryableError | null>(null);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
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

  const getFileType = useCallback((file: File): 'image' | 'document' | 'other' => {
    if (file.type.startsWith('image/')) {
      return 'image';
    }
    if (file.type === 'application/pdf' || 
        file.type === 'application/msword' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'text/plain') {
      return 'document';
    }
    return 'other';
  }, []);

  const generatePreview = useCallback(async (file: File): Promise<FilePreview> => {
    const fileType = getFileType(file);
    let url = '';

    if (fileType === 'image') {
      url = URL.createObjectURL(file);
    }

    return {
      file,
      url,
      type: fileType
    };
  }, [getFileType]);

  const generatePreviews = useCallback(async (files: File[]): Promise<FilePreview[]> => {
    const previews = await Promise.all(files.map(generatePreview));
    return previews;
  }, [generatePreview]);

  // Cleanup preview URLs when component unmounts or previews change
  useEffect(() => {
    return () => {
      filePreviews.forEach(preview => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [filePreviews]);

  const isNetworkError = useCallback((error: any): boolean => {
    // Check for common network error indicators
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch') ||
      errorCode === 'network_error' ||
      errorCode === 'timeout' ||
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      (error.response && error.response.status >= 500) ||
      (error.response && error.response.status === 0)
    );
  }, []);

  const createRetryableError = useCallback((error: any, retryCount: number = 0): RetryableError => {
    const isRetryable = isNetworkError(error) && retryCount < maxRetries;
    const message = error instanceof Error ? error.message : 'Upload failed';
    
    return {
      message,
      isRetryable,
      retryCount,
      maxRetries
    };
  }, [isNetworkError, maxRetries]);

  const delay = useCallback((ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }, []);

  const uploadWithRetry = useCallback(async (
    uploadFn: () => Promise<Document | Document[]>,
    retryCount: number = 0
  ): Promise<Document | Document[]> => {
    try {
      return await uploadFn();
    } catch (error) {
      const retryableError = createRetryableError(error, retryCount);
      
      if (retryableError.isRetryable) {
        // Exponential backoff: delay increases with each retry
        const delayMs = retryDelay * Math.pow(2, retryCount);
        await delay(delayMs);
        
        return uploadWithRetry(uploadFn, retryCount + 1);
      } else {
        throw error;
      }
    }
  }, [createRetryableError, retryDelay, delay]);

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

    // Generate previews if enabled
    if (showPreviews && validFiles.length > 0) {
      try {
        const previews = await generatePreviews(validFiles);
        setFilePreviews(previews);
      } catch (previewError) {
        console.warn('Failed to generate previews:', previewError);
      }
    }

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
        // Bulk upload with retry
        setUploadProgress(prev => prev.map(p => ({ ...p, status: 'uploading' as const })));
        
        const documents = await uploadWithRetry(
          () => documentService.uploadBulkDocuments(validFiles, folderId)
        ) as Document[];
        uploadedDocuments.push(...documents);
        
        setUploadProgress(prev => prev.map(p => ({ 
          ...p, 
          progress: 100, 
          status: 'completed' as const 
        })));
      } else {
        // Single file uploads with retry
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          
          setUploadProgress(prev => prev.map((p, index) => 
            index === i ? { ...p, status: 'uploading' as const } : p
          ));

          try {
            const document = await uploadWithRetry(
              () => documentService.uploadDocument(file, folderId)
            ) as Document;
            uploadedDocuments.push(document);
            
            setUploadProgress(prev => prev.map((p, index) => 
              index === i ? { ...p, progress: 100, status: 'completed' as const } : p
            ));
          } catch (fileError) {
            const retryableError = createRetryableError(fileError);
            setUploadProgress(prev => prev.map((p, index) => 
              index === i ? { 
                ...p, 
                status: 'error' as const, 
                error: retryableError.message
              } : p
            ));
          }
        }
      }

      if (uploadedDocuments.length > 0) {
        onUploadComplete?.(uploadedDocuments);
      }

      // Clear progress and previews after a delay
      setTimeout(() => {
        setUploadProgress([]);
        // Clean up preview URLs
        filePreviews.forEach(preview => {
          if (preview.url) {
            URL.revokeObjectURL(preview.url);
          }
        });
        setFilePreviews([]);
      }, 3000);

    } catch (error) {
      const retryableError = createRetryableError(error);
      setError(retryableError);
      onUploadError?.(retryableError.message);
      
      setUploadProgress(prev => prev.map(p => ({ 
        ...p, 
        status: 'error' as const, 
        error: retryableError.message 
      })));
    } finally {
      setIsUploading(false);
    }
  }, [folderId, multiple, validateFile, onUploadComplete, onUploadError, showPreviews, generatePreviews, filePreviews, uploadWithRetry, createRetryableError]);

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

  const removePreview = useCallback((index: number) => {
    setFilePreviews(prev => {
      const newPreviews = [...prev];
      const removedPreview = newPreviews.splice(index, 1)[0];
      if (removedPreview.url) {
        URL.revokeObjectURL(removedPreview.url);
      }
      return newPreviews;
    });
  }, []);

  const clearAllPreviews = useCallback(() => {
    filePreviews.forEach(preview => {
      if (preview.url) {
        URL.revokeObjectURL(preview.url);
      }
    });
    setFilePreviews([]);
  }, [filePreviews]);

  const retryUpload = useCallback(() => {
    if (error && error.isRetryable && filePreviews.length > 0) {
      setError(null);
      const fileList = new DataTransfer();
      filePreviews.forEach(preview => fileList.items.add(preview.file));
      handleFiles(fileList.files);
    }
  }, [error, filePreviews, handleFiles]);

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
                or <button 
                  type="button" 
                  className="file-upload__browse-link" 
                  onClick={handleBrowseClick}
                >
                  browse files
                </button>
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
        <div className="file-upload__error-container">
          <ErrorMessage 
            message={error.message}
            title={error.isRetryable ? 'Upload Failed - Network Error' : 'Upload Failed'}
            onDismiss={() => setError(null)}
            className="file-upload__error"
          />
          {error.isRetryable && (
            <div className="file-upload__retry-section">
              <p className="file-upload__retry-info">
                This appears to be a network issue. You can try uploading again.
                {error.retryCount > 0 && (
                  <span> (Attempted {error.retryCount} of {error.maxRetries} retries)</span>
                )}
              </p>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={retryUpload}
                disabled={isUploading || filePreviews.length === 0}
                className="file-upload__retry-button"
              >
                Retry Upload
              </Button>
            </div>
          )}
        </div>
      )}

      {showPreviews && filePreviews.length > 0 && !isUploading && (
        <div className="file-upload__previews">
          <div className="file-upload__previews-header">
            <h4>Selected Files ({filePreviews.length})</h4>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={clearAllPreviews}
              className="file-upload__clear-previews"
            >
              Clear All
            </Button>
          </div>
          <div className="file-upload__previews-grid">
            {filePreviews.map((preview, index) => (
              <div key={index} className="file-upload__preview-item">
                <div className="file-upload__preview-content">
                  {preview.type === 'image' ? (
                    <img 
                      src={preview.url} 
                      alt={preview.file.name}
                      className="file-upload__preview-image"
                      onError={() => {
                        console.warn(`Failed to load preview for ${preview.file.name}`);
                      }}
                    />
                  ) : (
                    <div className="file-upload__preview-icon">
                      {preview.type === 'document' ? (
                        <div className="file-upload__document-icon">
                          {preview.file.type === 'application/pdf' ? '📄' : 
                           preview.file.type.includes('word') ? '📝' : 
                           preview.file.type === 'text/plain' ? '📃' : '📄'}
                        </div>
                      ) : (
                        <div className="file-upload__other-icon">📎</div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="file-upload__preview-remove"
                    onClick={() => removePreview(index)}
                    aria-label={`Remove ${preview.file.name}`}
                  >
                    ✕
                  </button>
                </div>
                <div className="file-upload__preview-info">
                  <div className="file-upload__preview-name" title={preview.file.name}>
                    {preview.file.name}
                  </div>
                  <div className="file-upload__preview-size">
                    {formatFileSize(preview.file.size)}
                  </div>
                  <div className="file-upload__preview-type">
                    {preview.file.type || 'Unknown type'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="file-upload__previews-actions">
            <Button 
              variant="primary" 
              onClick={() => {
                const fileList = new DataTransfer();
                filePreviews.forEach(preview => fileList.items.add(preview.file));
                handleFiles(fileList.files);
              }}
              disabled={filePreviews.length === 0}
            >
              Upload {filePreviews.length} File{filePreviews.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
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
                  {isNetworkError({ message: progress.error }) && (
                    <div className="file-upload__progress-retry-hint">
                      <small>Network error - will retry automatically</small>
                    </div>
                  )}
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