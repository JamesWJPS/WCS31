import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { documentService } from '../../services';
import { Document, DocumentFilter } from '../../types';
import './DocumentList.css';

interface DocumentListProps {
  folderId?: string | null;
  onDocumentSelect?: (document: Document) => void;
  onDocumentEdit?: (document: Document) => void;
  onDocumentDelete?: (document: Document) => void;
  onDocumentMove?: (document: Document) => void;
  onBulkAction?: (action: 'move' | 'delete' | 'download', documents: Document[]) => void;
  showActions?: boolean;
  selectable?: boolean;
  className?: string;
}

const DocumentList: React.FC<DocumentListProps> = ({
  folderId,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentMove,
  onBulkAction,
  showActions = true,
  selectable = false,
  className = '',
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DocumentFilter>({});
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showBulkActions, setShowBulkActions] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let docs: Document[];
      if (folderId) {
        docs = await documentService.getDocumentsInFolder(folderId);
      } else {
        docs = await documentService.getDocuments();
      }
      
      setDocuments(docs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Filter and sort documents
  const processedDocuments = useMemo(() => {
    let filtered = documents;

    // Apply filters
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.originalName.toLowerCase().includes(searchLower) ||
        doc.metadata.title?.toLowerCase().includes(searchLower) ||
        doc.metadata.description?.toLowerCase().includes(searchLower) ||
        doc.metadata.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (filter.mimeType) {
      filtered = filtered.filter(doc => doc.mimeType === filter.mimeType);
    }

    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(doc => 
        doc.metadata.tags?.some(tag => filter.tags!.includes(tag))
      );
    }

    if (filter.uploadedBy) {
      filtered = filtered.filter(doc => doc.uploadedBy === filter.uploadedBy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.originalName.localeCompare(b.originalName);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.mimeType.localeCompare(b.mimeType);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [documents, filter, sortBy, sortOrder]);

  useEffect(() => {
    setFilteredDocuments(processedDocuments);
  }, [processedDocuments]);

  const handleFilterChange = useCallback((newFilter: Partial<DocumentFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const handleSortChange = useCallback((field: 'name' | 'date' | 'size' | 'type') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const handleDocumentSelect = useCallback((document: Document) => {
    if (selectable) {
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(document.id)) {
          newSet.delete(document.id);
        } else {
          newSet.add(document.id);
        }
        return newSet;
      });
    }
    onDocumentSelect?.(document);
  }, [selectable, onDocumentSelect]);

  const handleSelectAll = useCallback(() => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  }, [selectedDocuments.size, filteredDocuments]);

  const handleBulkAction = useCallback((action: 'move' | 'delete' | 'download') => {
    const selectedDocs = filteredDocuments.filter(doc => selectedDocuments.has(doc.id));
    onBulkAction?.(action, selectedDocs);
    setSelectedDocuments(new Set());
    setShowBulkActions(false);
  }, [filteredDocuments, selectedDocuments, onBulkAction]);

  const handleDownloadDocument = useCallback(async (document: Document) => {
    try {
      const blob = await documentService.downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.originalName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.startsWith('text/')) return '📃';
    return '📁';
  };

  const uniqueMimeTypes = useMemo(() => {
    const types = new Set(documents.map(doc => doc.mimeType));
    return Array.from(types).sort();
  }, [documents]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    documents.forEach(doc => {
      doc.metadata.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [documents]);

  if (isLoading) {
    return (
      <div className={`document-list ${className}`}>
        <div className="document-list__loading">
          <LoadingSpinner />
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`document-list ${className}`}>
        <ErrorMessage 
          message={error}
          onDismiss={() => setError(null)}
        />
        <Button onClick={loadDocuments} className="document-list__retry">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`document-list ${className}`}>
      {/* Filters and Controls */}
      <div className="document-list__controls">
        <div className="document-list__filters">
          <Input
            type="text"
            placeholder="Search documents..."
            value={filter.search || ''}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className="document-list__search"
          />
          
          <Select
            value={filter.mimeType || ''}
            onChange={(e) => handleFilterChange({ mimeType: e.target.value || undefined })}
            className="document-list__filter"
          >
            <option value="">All Types</option>
            {uniqueMimeTypes.map(type => (
              <option key={type} value={type}>
                {type.split('/')[1].toUpperCase()}
              </option>
            ))}
          </Select>

          {uniqueTags.length > 0 && (
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const currentTags = filter.tags || [];
                  if (!currentTags.includes(e.target.value)) {
                    handleFilterChange({ tags: [...currentTags, e.target.value] });
                  }
                }
              }}
              className="document-list__filter"
            >
              <option value="">Add Tag Filter</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="document-list__view-controls">
          <div className="document-list__sort">
            <Button
              variant="ghost"
              size="small"
              onClick={() => handleSortChange('name')}
              className={sortBy === 'name' ? 'document-list__sort-active' : ''}
            >
              Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={() => handleSortChange('date')}
              className={sortBy === 'date' ? 'document-list__sort-active' : ''}
            >
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={() => handleSortChange('size')}
              className={sortBy === 'size' ? 'document-list__sort-active' : ''}
            >
              Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>

          <div className="document-list__view-mode">
            <Button
              variant="ghost"
              size="small"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'document-list__view-active' : ''}
              aria-label="List view"
            >
              📋
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'document-list__view-active' : ''}
              aria-label="Grid view"
            >
              ⊞
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(filter.tags && filter.tags.length > 0) && (
        <div className="document-list__active-filters">
          <span>Active filters:</span>
          {filter.tags.map(tag => (
            <span key={tag} className="document-list__filter-tag">
              {tag}
              <button
                onClick={() => {
                  const newTags = filter.tags!.filter(t => t !== tag);
                  handleFilterChange({ tags: newTags.length > 0 ? newTags : undefined });
                }}
                aria-label={`Remove ${tag} filter`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {selectable && selectedDocuments.size > 0 && (
        <div className="document-list__bulk-actions">
          <span>{selectedDocuments.size} selected</span>
          <Button
            variant="ghost"
            size="small"
            onClick={() => setShowBulkActions(true)}
          >
            Actions
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => setSelectedDocuments(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Document Count */}
      <div className="document-list__info">
        <span>
          {filteredDocuments.length} of {documents.length} documents
          {folderId && ' in this folder'}
        </span>
        {selectable && (
          <Button
            variant="ghost"
            size="small"
            onClick={handleSelectAll}
          >
            {selectedDocuments.size === filteredDocuments.length ? 'Deselect All' : 'Select All'}
          </Button>
        )}
      </div>

      {/* Document List/Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="document-list__empty">
          <p>No documents found</p>
          {filter.search && (
            <Button onClick={() => handleFilterChange({ search: '' })}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className={`document-list__items document-list__items--${viewMode}`}>
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className={`document-list__item ${selectedDocuments.has(document.id) ? 'document-list__item--selected' : ''}`}
              onClick={() => handleDocumentSelect(document)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDocumentSelect(document);
                }
              }}
            >
              {selectable && (
                <input
                  type="checkbox"
                  checked={selectedDocuments.has(document.id)}
                  onChange={() => handleDocumentSelect(document)}
                  className="document-list__checkbox"
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              <div className="document-list__icon">
                {getFileIcon(document.mimeType)}
              </div>

              <div className="document-list__content">
                <h4 className="document-list__name">
                  {document.metadata.title || document.originalName}
                </h4>
                {document.metadata.description && (
                  <p className="document-list__description">
                    {document.metadata.description}
                  </p>
                )}
                <div className="document-list__meta">
                  <span className="document-list__size">
                    {formatFileSize(document.size)}
                  </span>
                  <span className="document-list__date">
                    {formatDate(document.createdAt)}
                  </span>
                  <span className="document-list__type">
                    {document.mimeType.split('/')[1].toUpperCase()}
                  </span>
                </div>
                {document.metadata.tags && document.metadata.tags.length > 0 && (
                  <div className="document-list__tags">
                    {document.metadata.tags.map(tag => (
                      <span key={tag} className="document-list__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {showActions && (
                <div className="document-list__actions">
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadDocument(document);
                    }}
                    title="Download"
                  >
                    ⬇️
                  </Button>
                  {onDocumentEdit && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocumentEdit(document);
                      }}
                      title="Edit"
                    >
                      ✏️
                    </Button>
                  )}
                  {onDocumentMove && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocumentMove(document);
                      }}
                      title="Move"
                    >
                      📁
                    </Button>
                  )}
                  {onDocumentDelete && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocumentDelete(document);
                      }}
                      title="Delete"
                    >
                      🗑️
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkActions && (
        <Modal
          isOpen={showBulkActions}
          onClose={() => setShowBulkActions(false)}
          title="Bulk Actions"
        >
          <div className="document-list__bulk-modal">
            <p>{selectedDocuments.size} documents selected</p>
            <div className="document-list__bulk-buttons">
              <Button onClick={() => handleBulkAction('download')}>
                Download All
              </Button>
              {onBulkAction && (
                <>
                  <Button onClick={() => handleBulkAction('move')}>
                    Move All
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete All
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DocumentList;