import React, { useState, useEffect } from 'react';
import { ContentItem, ErrorState, LoadingState } from '../../types';
import { ContentUpdateEvent } from '../../services/realTimeContentService';
import DragDropMenuManager from './DragDropMenuManager';
import './PageMenuSidebar.css';

interface PageMenuSidebarProps {
  isAdminMode: boolean;
  onPageSelect: (content: ContentItem) => void;
  selectedContentId?: string | undefined;
  showAdminControls?: boolean;
  contents?: ContentItem[];
  loading?: boolean;
  loadingState?: LoadingState;
  error?: string | null;
  errorState?: ErrorState | null;
  onEditContent?: (content: ContentItem) => void;
  onDeleteContent?: (content: ContentItem) => void;
  onContentUpdate?: (event: ContentUpdateEvent) => void;
  onQuickEdit?: (content: ContentItem) => void;
  onDuplicateContent?: (content: ContentItem) => void;
  lastUpdate?: Date | null;
  isRealTimeEnabled?: boolean;
  isHealthy?: boolean;
  onRetry?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  onClearError?: () => void;
  onMenuUpdate?: (updates: MenuUpdate[]) => Promise<void>;
}

interface MenuUpdate {
  id: string;
  menu_order: number;
  parent_id?: string | null;
  show_in_menu?: boolean | number;
}

const PageMenuSidebar: React.FC<PageMenuSidebarProps> = ({
  isAdminMode,
  onPageSelect,
  selectedContentId,
  showAdminControls = false,
  contents = [],
  loading = false,
  loadingState,
  error,
  errorState,
  onEditContent,
  onDeleteContent,
  onContentUpdate,
  onQuickEdit,
  onDuplicateContent,
  lastUpdate,
  isRealTimeEnabled = false,
  isHealthy = true,
  onRetry,
  onRefresh,
  onClearError,
  onMenuUpdate
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [menuTree, setMenuTree] = useState<ContentItem[]>([]);
  const [updateIndicator, setUpdateIndicator] = useState<boolean>(false);
  const [showContextMenu, setShowContextMenu] = useState<{ itemId: string; x: number; y: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContentItem | null>(null);
  const [retryingOperation, setRetryingOperation] = useState<boolean>(false);
  const [refreshingContent, setRefreshingContent] = useState<boolean>(false);
  const [showMenuManager, setShowMenuManager] = useState<boolean>(false);

  // Build hierarchical menu tree from flat content array
  useEffect(() => {
    const buildMenuTree = (items: ContentItem[]): ContentItem[] => {
      const tree: ContentItem[] = [];
      const itemMap = new Map<string, ContentItem & { children: ContentItem[] }>();
      
      // Create a map of all content items with children array
      items.forEach(item => {
        itemMap.set(item.id, { ...item, children: [] });
      });
      
      // Build the tree structure
      items.forEach(item => {
        const treeItem = itemMap.get(item.id);
        if (item.parent_id && itemMap.has(item.parent_id)) {
          itemMap.get(item.parent_id)!.children.push(treeItem!);
        } else {
          tree.push(treeItem!);
        }
      });
      
      // Sort by menu_order
      const sortByOrder = (a: ContentItem, b: ContentItem) => 
        (a.menu_order || 0) - (b.menu_order || 0);
      
      tree.sort(sortByOrder);
      tree.forEach(item => {
        if (item.children && item.children.length > 0) {
          item.children.sort(sortByOrder);
        }
      });
      
      return tree;
    };

    setMenuTree(buildMenuTree(contents));
  }, [contents]);

  // Show update indicator when content updates
  useEffect(() => {
    if (lastUpdate && isRealTimeEnabled) {
      setUpdateIndicator(true);
      const timer = setTimeout(() => {
        setUpdateIndicator(false);
      }, 2000); // Show indicator for 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [lastUpdate, isRealTimeEnabled]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handlePageClick = (item: ContentItem) => {
    onPageSelect(item);
    // Note: URL hash is handled by the parent component to maintain proper context
  };

  const handleEditClick = (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    if (onEditContent) {
      onEditContent(item);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    setConfirmDelete(item);
  };

  const handleQuickEditClick = (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    if (onQuickEdit) {
      onQuickEdit(item);
    }
  };

  const handleDuplicateClick = (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    if (onDuplicateContent) {
      onDuplicateContent(item);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: ContentItem) => {
    if (!isAdminMode || !showAdminControls) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setShowContextMenu({
      itemId: item.id,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleConfirmDelete = () => {
    if (confirmDelete && onDeleteContent) {
      onDeleteContent(confirmDelete);
      setConfirmDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    try {
      setRetryingOperation(true);
      await onRetry();
      if (onClearError) {
        onClearError();
      }
    } catch (error) {
      console.error('Retry operation failed:', error);
    } finally {
      setRetryingOperation(false);
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    try {
      setRefreshingContent(true);
      await onRefresh();
      if (onClearError) {
        onClearError();
      }
    } catch (error) {
      console.error('Refresh operation failed:', error);
    } finally {
      setRefreshingContent(false);
    }
  };

  const handleClearError = () => {
    if (onClearError) {
      onClearError();
    }
  };

  const handleMenuUpdate = async (updates: MenuUpdate[]) => {
    if (onMenuUpdate) {
      await onMenuUpdate(updates);
      setShowMenuManager(false);
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(null);
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const renderMenuItem = (item: ContentItem, level: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedContentId === item.id;
    const displayTitle = item.menu_title || item.title;
    const isDraft = item.status === 'draft';
    const isHidden = !item.show_in_menu || item.show_in_menu === 0;

    return (
      <div key={item.id} className="page-menu-item">
        <div className="page-menu-item-wrapper">
          <button
            className={`page-menu-button ${isSelected ? 'selected' : ''} ${isDraft ? 'draft' : ''}`}
            onClick={() => handlePageClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
            style={{ paddingLeft: `${1 + level * 1.5}rem` }}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-level={level + 1}
          >
            <div className="page-menu-content">
              <div className="page-menu-title">
                {hasChildren && (
                  <span
                    className="expand-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(item.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleExpanded(item.id);
                      }
                    }}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                  </span>
                )}
                {hasChildren && (
                  <i className="bi bi-folder me-2 text-muted"></i>
                )}
                <span className="title-text">{displayTitle}</span>
                
                {/* Admin-specific indicators */}
                {isAdminMode && (
                  <div className="admin-indicators">
                    {isDraft && (
                      <span className="badge badge-draft" title="Draft content">
                        Draft
                      </span>
                    )}
                    {isHidden && (
                      <span className="badge badge-hidden" title="Hidden from menu">
                        Hidden
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Last updated info for non-admin mode */}
              {!isAdminMode && item.updated_at && (
                <small className="last-updated">
                  {new Date(item.updated_at).toLocaleDateString()}
                </small>
              )}
            </div>
          </button>
          
          {/* Admin controls - outside the button to avoid nesting */}
          {isAdminMode && showAdminControls && (
            <div className="admin-controls">
              <button
                className="admin-control-btn quick-edit-btn"
                onClick={(e) => handleQuickEditClick(e, item)}
                title="Quick edit"
                aria-label={`Quick edit ${displayTitle}`}
              >
                <i className="bi bi-lightning"></i>
              </button>
              <button
                className="admin-control-btn edit-btn"
                onClick={(e) => handleEditClick(e, item)}
                title="Edit content"
                aria-label={`Edit ${displayTitle}`}
              >
                <i className="bi bi-pencil"></i>
              </button>
              <button
                className="admin-control-btn more-btn"
                onClick={(e) => handleContextMenu(e, item)}
                title="More options"
                aria-label={`More options for ${displayTitle}`}
              >
                <i className="bi bi-three-dots"></i>
              </button>
            </div>
          )}
        </div>
        
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="page-menu-children" role="group">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading || loadingState?.isLoading) {
    const operation = loadingState?.operation || 'loading';
    const loadingText = {
      'initial-load': 'Loading pages...',
      'refresh-contents': 'Refreshing content...',
      'retry-operation': 'Retrying...',
      'loading': 'Loading pages...'
    }[operation] || 'Loading...';

    return (
      <div className="page-menu-sidebar">
        <div className="page-menu-header">
          <h6 className="menu-title">
            <i className="bi bi-list me-2"></i>
            Pages
          </h6>
        </div>
        <div className="page-menu-loading">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">{loadingText}</span>
          </div>
          <div className="loading-text">{loadingText}</div>
          {loadingState?.progress !== undefined && (
            <div className="loading-progress">
              <div 
                className="progress-bar" 
                style={{ width: `${loadingState.progress}%` }}
                role="progressbar"
                aria-valuenow={loadingState.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error state if there's an error and no content
  if (error && menuTree.length === 0) {
    return (
      <div className="page-menu-sidebar">
        <div className="page-menu-header">
          <h6 className="menu-title">
            <i className="bi bi-list me-2"></i>
            Pages
          </h6>
        </div>
        <div className="page-menu-error">
          <div className="error-icon">
            <i className="bi bi-exclamation-triangle text-danger"></i>
          </div>
          <div className="error-content">
            <h6 className="error-title">Failed to Load Pages</h6>
            <p className="error-message">{error}</p>
            {errorState?.details?.retryCount && (
              <small className="error-details">
                Retry attempt {errorState.details.retryCount} of 3
              </small>
            )}
          </div>
          <div className="error-actions">
            {errorState?.retryable && onRetry && (
              <button
                className="btn btn-sm btn-primary"
                onClick={handleRetry}
                disabled={retryingOperation}
              >
                {retryingOperation ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Retrying...</span>
                    </div>
                    Retrying...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Retry
                  </>
                )}
              </button>
            )}
            {onRefresh && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={handleRefresh}
                disabled={refreshingContent}
              >
                {refreshingContent ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Refreshing...</span>
                    </div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-counterclockwise me-2"></i>
                    Refresh
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (menuTree.length === 0) {
    return (
      <div className="page-menu-sidebar">
        <div className="page-menu-header">
          <h6 className="menu-title">
            <i className="bi bi-list me-2"></i>
            Pages
          </h6>
        </div>
        <div className="page-menu-empty">
          <i className="bi bi-file-text text-muted"></i>
          <p>No pages available</p>
          {isAdminMode && (
            <small className="text-muted">Create your first page to get started</small>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-menu-sidebar">
      <div className="page-menu-header">
        <h6 className="menu-title">
          <i className="bi bi-list me-2"></i>
          Pages
          {updateIndicator && (
            <span className="update-indicator" title="Content updated">
              <i className="bi bi-arrow-clockwise text-success"></i>
            </span>
          )}
          {error && !loading && (
            <span className="error-indicator" title={`Error: ${error}`}>
              <i className="bi bi-exclamation-triangle text-warning"></i>
            </span>
          )}
        </h6>
        {isAdminMode && (
          <div className="admin-mode-indicators">
            <small className="admin-mode-indicator">
              <i className="bi bi-shield-check me-1"></i>
              Admin View
            </small>
            {onMenuUpdate && (
              <button
                className="btn btn-sm btn-outline-primary menu-manager-btn"
                onClick={() => setShowMenuManager(true)}
                title="Manage menu order"
              >
                <i className="bi bi-list-ul"></i>
              </button>
            )}
            {isRealTimeEnabled && (
              <small 
                className={`real-time-indicator ${isHealthy ? 'healthy' : 'unhealthy'}`}
                title={
                  isHealthy 
                    ? `Live updates active${lastUpdate ? ` - Last updated: ${lastUpdate.toLocaleTimeString()}` : ''}`
                    : 'Live updates experiencing issues'
                }
              >
                <i className={`bi ${isHealthy ? 'bi-broadcast' : 'bi-broadcast-off'} me-1`}></i>
                {isHealthy ? 'Live' : 'Offline'}
              </small>
            )}
            {error && (
              <div className="error-banner">
                <small className="error-banner-text">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Connection issues
                </small>
                {errorState?.retryable && onRetry && (
                  <button
                    className="error-banner-retry"
                    onClick={handleRetry}
                    disabled={retryingOperation}
                    title="Retry failed operation"
                  >
                    <i className={`bi ${retryingOperation ? 'bi-arrow-clockwise spinning' : 'bi-arrow-clockwise'}`}></i>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <nav className="page-menu-nav" role="navigation" aria-label="Page navigation">
        <div className="page-menu-list" role="tree">
          {menuTree.map(item => renderMenuItem(item))}
        </div>
      </nav>
      
      {/* Admin login link for public mode */}
      {!isAdminMode && (
        <div className="admin-login-section">
          <small className="text-muted">
            <i className="bi bi-shield-lock me-1"></i>
            <a 
              href="#" 
              onClick={(e) => { 
                e.preventDefault(); 
                // This will be handled by parent component
              }} 
              className="text-decoration-none"
            >
              Admin Login
            </a>
          </small>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            left: showContextMenu.x,
            top: showContextMenu.y,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-content">
            {(() => {
              const item = contents.find(c => c.id === showContextMenu.itemId);
              if (!item) return null;
              
              return (
                <>
                  <button
                    className="context-menu-item"
                    onClick={() => {
                      if (onQuickEdit) onQuickEdit(item);
                      setShowContextMenu(null);
                    }}
                  >
                    <i className="bi bi-lightning me-2"></i>
                    Quick Edit
                  </button>
                  <button
                    className="context-menu-item"
                    onClick={() => {
                      if (onEditContent) onEditContent(item);
                      setShowContextMenu(null);
                    }}
                  >
                    <i className="bi bi-pencil me-2"></i>
                    Full Edit
                  </button>
                  <button
                    className="context-menu-item"
                    onClick={() => {
                      if (onDuplicateContent) onDuplicateContent(item);
                      setShowContextMenu(null);
                    }}
                  >
                    <i className="bi bi-files me-2"></i>
                    Duplicate
                  </button>
                  <div className="context-menu-divider"></div>
                  <button
                    className="context-menu-item danger"
                    onClick={() => {
                      setConfirmDelete(item);
                      setShowContextMenu(null);
                    }}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Delete
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirmation-header">
              <h5>Confirm Delete</h5>
              <button 
                className="close-btn"
                onClick={handleCancelDelete}
                aria-label="Close dialog"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="confirmation-body">
              <div className="warning-icon">
                <i className="bi bi-exclamation-triangle text-warning"></i>
              </div>
              <p>
                Are you sure you want to delete <strong>"{confirmDelete.title}"</strong>?
              </p>
              <p className="text-muted">
                This action cannot be undone. The page and all its content will be permanently removed.
              </p>
              {confirmDelete.children && confirmDelete.children.length > 0 && (
                <div className="warning-message">
                  <i className="bi bi-info-circle me-2"></i>
                  This page has {confirmDelete.children.length} child page(s) that will also be affected.
                </div>
              )}
            </div>
            <div className="confirmation-actions">
              <button 
                className="btn btn-secondary"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                <i className="bi bi-trash me-2"></i>
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Manager Modal */}
      {showMenuManager && onMenuUpdate && (
        <DragDropMenuManager
          contents={contents}
          onMenuUpdate={handleMenuUpdate}
          onClose={() => setShowMenuManager(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default PageMenuSidebar;