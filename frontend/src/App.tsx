import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppRouter from './router/AppRouter';
import PageMenuSidebar from './components/layout/PageMenuSidebar';
import { ContentItem } from './types';
import { useRealTimeContent } from './hooks/useRealTimeContent';
import { ContentUpdateEvent } from './services/realTimeContentService';

// Drag and Drop Menu Organizer Component
const MenuOrganizer: React.FC<{
  contents: any[];
  onReorder: (reorderedContents: any[]) => void;
  onClose: () => void;
}> = ({ contents, onReorder, onClose }) => {
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverItem, setDragOverItem] = useState<any>(null);
  const [localContents, setLocalContents] = useState<any[]>([]);

  useEffect(() => {
    // Build tree structure for display
    setLocalContents(buildMenuTree(contents));
  }, [contents]);

  const buildMenuTree = (items: any[]) => {
    const tree: any[] = [];
    const itemMap = new Map();
    
    // Create a map of all items
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });
    
    // Build the tree structure
    items.forEach(item => {
      const treeItem = itemMap.get(item.id);
      if (item.parent_id && itemMap.has(item.parent_id)) {
        itemMap.get(item.parent_id).children.push(treeItem);
      } else {
        tree.push(treeItem);
      }
    });
    
    // Sort by menu_order
    const sortByOrder = (a: any, b: any) => (a.menu_order || 0) - (b.menu_order || 0);
    tree.sort(sortByOrder);
    tree.forEach(item => {
      if (item.children.length > 0) {
        item.children.sort(sortByOrder);
      }
    });
    
    return tree;
  };

  const flattenTree = (tree: any[], parentId: string | null = null): any[] => {
    const flattened: any[] = [];
    tree.forEach((item, index) => {
      flattened.push({
        ...item,
        parent_id: parentId,
        menu_order: index + 1
      });
      if (item.children && item.children.length > 0) {
        flattened.push(...flattenTree(item.children, item.id));
      }
    });
    return flattened;
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, item: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(item);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, dropTarget: any) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === dropTarget.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const dropPosition = e.currentTarget.getAttribute('data-drop-position');
    
    // Create new tree structure
    const newTree = [...localContents];
    
    // Remove dragged item from its current position
    const removeDraggedItem = (items: any[]): any[] => {
      return items.filter(item => {
        if (item.id === draggedItem.id) {
          return false;
        }
        if (item.children) {
          item.children = removeDraggedItem(item.children);
        }
        return true;
      });
    };

    const cleanedTree = removeDraggedItem(newTree);

    if (dropPosition === 'child') {
      // Add as child
      const addAsChild = (items: any[]): any[] => {
        return items.map(item => {
          if (item.id === dropTarget.id) {
            return {
              ...item,
              children: [...(item.children || []), { ...draggedItem, children: [] }]
            };
          }
          if (item.children) {
            item.children = addAsChild(item.children);
          }
          return item;
        });
      };
      setLocalContents(addAsChild(cleanedTree));
    } else {
      // Add as sibling (before or after)
      const addAsSibling = (items: any[], parentId: string | null = null): any[] => {
        const newItems = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          if (item.id === dropTarget.id) {
            if (dropPosition === 'before') {
              newItems.push({ ...draggedItem, children: [] });
              newItems.push(item);
            } else {
              newItems.push(item);
              newItems.push({ ...draggedItem, children: [] });
            }
          } else {
            if (item.children) {
              item.children = addAsSibling(item.children, item.id);
            }
            newItems.push(item);
          }
        }
        return newItems;
      };
      setLocalContents(addAsSibling(cleanedTree));
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleMoveToRoot = (item: any) => {
    const newTree = [...localContents];
    
    // Remove from current position
    const removeItem = (items: any[]): any[] => {
      return items.filter(treeItem => {
        if (treeItem.id === item.id) {
          return false;
        }
        if (treeItem.children) {
          treeItem.children = removeItem(treeItem.children);
        }
        return true;
      });
    };

    const cleanedTree = removeItem(newTree);
    
    // Add to root level
    cleanedTree.push({ ...item, children: [] });
    
    setLocalContents(cleanedTree);
  };

  const handleSave = () => {
    const flattened = flattenTree(localContents);
    onReorder(flattened);
  };

  const renderMenuItem = (item: any, level: number = 0) => {
    const isDraggedOver = dragOverItem?.id === item.id;
    const isDragging = draggedItem?.id === item.id;

    return (
      <div key={item.id} className={`menu-item ${isDragging ? 'dragging' : ''}`}>
        {/* Drop zone - Before */}
        {draggedItem && draggedItem.id !== item.id && (
          <div
            className="drop-zone drop-zone-before"
            data-drop-position="before"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => handleDrop(e, item)}
          >
            <div className="drop-indicator">Drop here to place before "{item.menu_title || item.title}"</div>
          </div>
        )}

        <div
          className={`list-group-item ${isDraggedOver ? 'drag-over' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={(e) => handleDragOver(e, item)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            e.currentTarget.setAttribute('data-drop-position', 'child');
            handleDrop(e, item);
          }}
          style={{ 
            paddingLeft: `${1 + level * 2}rem`,
            cursor: 'move',
            opacity: isDragging ? 0.5 : 1
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <i className="bi bi-grip-vertical me-2 text-muted"></i>
              {item.children && item.children.length > 0 && (
                <i className="bi bi-folder me-2 text-primary"></i>
              )}
              <span>{item.menu_title || item.title}</span>
              {!item.show_in_menu && (
                <span className="badge bg-secondary ms-2">Hidden</span>
              )}
              {draggedItem && draggedItem.id !== item.id && (
                <small className="text-muted ms-2">
                  <i className="bi bi-arrow-down me-1"></i>Drop to make child
                </small>
              )}
            </div>
            <div>
              {level > 0 && (
                <button
                  className="btn btn-sm btn-outline-secondary me-2"
                  onClick={() => handleMoveToRoot(item)}
                  title="Move to root level"
                >
                  <i className="bi bi-arrow-up"></i>
                </button>
              )}
              <small className="text-muted">Order: {item.menu_order || 0}</small>
            </div>
          </div>
        </div>

        {item.children && item.children.map((child: any) => renderMenuItem(child, level + 1))}

        {/* Drop zone - After */}
        {draggedItem && draggedItem.id !== item.id && (
          <div
            className="drop-zone drop-zone-after"
            data-drop-position="after"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => handleDrop(e, item)}
          >
            <div className="drop-indicator">Drop here to place after "{item.menu_title || item.title}"</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-list-nested me-2"></i>
              Organise Menu Structure
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Drag and drop</strong> pages to reorder them or create nested structures. 
              Drop a page onto another to make it a child page.
            </div>
            
            <div className="list-group">
              {localContents.map(item => renderMenuItem(item))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <i className="bi bi-check-circle me-2"></i>
              Save Changes
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .menu-item.dragging {
          opacity: 0.5;
        }
        .list-group-item.drag-over {
          border-color: #0d6efd;
          background-color: #e7f3ff;
        }
        .list-group-item[draggable] {
          transition: all 0.2s ease;
        }
        .list-group-item[draggable]:hover {
          background-color: #f8f9fa;
        }
        .drop-zone {
          height: 8px;
          margin: 2px 0;
          border-radius: 4px;
          transition: all 0.2s ease;
          opacity: 0;
        }
        .drop-zone:hover,
        .drop-zone.drag-over {
          opacity: 1;
          background-color: #0d6efd;
          height: 20px;
        }
        .drop-indicator {
          color: white;
          font-size: 11px;
          text-align: center;
          line-height: 20px;
          font-weight: 500;
        }
        .drop-zone-before {
          border-top: 2px dashed #0d6efd;
        }
        .drop-zone-after {
          border-bottom: 2px dashed #0d6efd;
        }
      `}</style>
    </div>
  );
};

// Public Content Display Component
const PublicContentDisplay: React.FC = () => {
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [selectedContentDetails, setSelectedContentDetails] = useState<any>(null);
  const [loadingContentDetails, setLoadingContentDetails] = useState(false);

  // Use real-time content hook for public content
  const {
    contents,
    loading,
    error: contentError,
    lastUpdate,
    isMonitoring
  } = useRealTimeContent({
    autoStart: true,
    pollingInterval: 10000, // Longer interval for public users
    onContentUpdate: handleContentUpdate
  });

  // Handle content updates from real-time service
  function handleContentUpdate(event: ContentUpdateEvent) {
    console.log('Public content update received:', event);
    
    // If the currently selected content was updated, refresh its details
    if (selectedContent && event.contentId === selectedContent.id && event.type === 'updated') {
      loadContentDetails(selectedContent.id);
    }
    
    // If the currently selected content was deleted, clear selection
    if (selectedContent && event.contentId === selectedContent.id && event.type === 'deleted') {
      setSelectedContent(null);
      setSelectedContentDetails(null);
      window.location.hash = '';
    }
  }

  // Convert to ContentItem format for PageMenuSidebar
  const contentItems: ContentItem[] = contents
    .filter(item => item.status === 'published' && item.show_in_menu) // Only show published content in menu
    .map(item => ({
      id: item.id,
      title: item.title,
      ...(item.slug && { slug: item.slug }),
      ...(item.menu_title && { menu_title: item.menu_title }),
      ...(item.parent_id !== undefined && { parent_id: item.parent_id }),
      ...(item.menu_order !== undefined && { menu_order: item.menu_order }),
      ...(item.show_in_menu !== undefined && { show_in_menu: item.show_in_menu }),
      ...(item.status && { status: item.status }),
      ...(item.updatedAt && { updated_at: item.updatedAt })
    }));

  // Load content details for a specific content ID
  const loadContentDetails = async (contentId: string) => {
    try {
      setLoadingContentDetails(true);
      const response = await fetch(`http://localhost:3001/api/content/${contentId}`);
      const result = await response.json();
      if (result.success) {
        setSelectedContentDetails(result.data);
      } else {
        console.error('Content not found:', contentId);
        setSelectedContentDetails(null);
      }
    } catch (error) {
      console.error('Failed to load content details:', error);
      setSelectedContentDetails(null);
    } finally {
      setLoadingContentDetails(false);
    }
  };

  // Check for URL hash to load specific content after contents are loaded
  useEffect(() => {
    if (contentItems.length > 0) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        loadContentByIdentifier(hash);
      } else if (!selectedContent) {
        // Auto-select the first content if available and no hash
        const firstContent = contentItems[0];
        if (firstContent) {
          setSelectedContent(firstContent);
          loadContentDetails(firstContent.id);
        }
      }
    }
  }, [contentItems]);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash && contentItems.length > 0) {
        loadContentByIdentifier(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [contentItems]);

  const loadContentByIdentifier = async (identifier: string) => {
    try {
      // First try to find by slug, then by ID
      let targetContent = contentItems.find(c => c.slug === identifier);
      if (!targetContent) {
        targetContent = contentItems.find(c => c.id === identifier);
      }
      
      if (targetContent) {
        setSelectedContent(targetContent);
        await loadContentDetails(targetContent.id);
      } else {
        console.error('Content not found:', identifier);
        // Fallback to first available content
        if (contentItems.length > 0) {
          const firstContent = contentItems[0];
          setSelectedContent(firstContent);
          await loadContentDetails(firstContent.id);
          window.location.hash = '';
        }
      }
    } catch (error) {
      console.error('Error loading content by identifier:', error);
    }
  };

  const handlePageSelect = async (content: ContentItem) => {
    setSelectedContent(content);
    window.location.hash = content.slug || content.id;
    await loadContentDetails(content.id);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-3">Loading content...</div>
        </div>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bi bi-file-text fs-1 text-muted mb-3"></i>
              <h4>Welcome to Our Website</h4>
              <p className="text-muted">
                No published content is currently available. Please check back later.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row">
      {/* Content Navigation Sidebar */}
      <div className="col-md-3">
        <PageMenuSidebar
          isAdminMode={false}
          onPageSelect={handlePageSelect}
          selectedContentId={selectedContent?.id}
          showAdminControls={false}
          contents={contentItems}
          loading={loading}
          lastUpdate={lastUpdate}
          isRealTimeEnabled={isMonitoring}
        />
      </div>

      {/* Main Content Area */}
      <div className="col-md-9">
        {selectedContent ? (
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h3 className="mb-0">{selectedContent.title}</h3>
                  <small className="text-muted">
                    Last updated: {selectedContent.updated_at ? new Date(selectedContent.updated_at).toLocaleDateString() : 'Unknown'}
                  </small>
                </div>
                <div className="text-end">
                  <small className="text-muted">
                    <i className="bi bi-link-45deg me-1"></i>
                    Direct link: #{selectedContent.slug || selectedContent.id}
                  </small>
                </div>
              </div>
            </div>
            <div className="card-body">
              {loadingContentDetails ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading content...</span>
                  </div>
                  <p className="mt-2">Loading content details...</p>
                </div>
              ) : selectedContentDetails ? (
                <div 
                  className="content-display"
                  dangerouslySetInnerHTML={{ __html: selectedContentDetails.body || '' }}
                  style={{
                    lineHeight: '1.6',
                    fontSize: '16px'
                  }}
                />
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-exclamation-triangle fs-1 text-muted mb-3"></i>
                  <h5>Content not available</h5>
                  <p className="text-muted">Failed to load content details. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bi bi-arrow-left fs-1 text-muted mb-3"></i>
              <h5>Select a page to view</h5>
              <p className="text-muted">Choose a page from the sidebar to display its content.</p>
              {contentError && (
                <div className="alert alert-warning mt-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Error loading content: {contentError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Login Form Component (for admin access)
const AdminLoginForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(credentials.username, credentials.password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <div className="card">
          <div className="card-header text-center">
            <h4>
              <i className="bi bi-shield-lock me-2"></i>
              Admin Login
            </h4>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  required
                />
              </div>
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Sign In
                    </>
                  )}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Website
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rich Text Editor Component
const RichTextEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  const editorRef = useRef<HTMLDivElement>(null);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  };

  const restoreSelection = (range: Range | null) => {
    if (range) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const handleWysiwygChange = () => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      setLastValue(newValue);
      onChange(newValue);
    }
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLastValue(newValue);
    onChange(newValue);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleWysiwygChange();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  // Initialize editor content on first load
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === '' && value) {
      editorRef.current.innerHTML = value;
      setLastValue(value);
    }
  }, []);

  // Only update innerHTML when switching modes or when value changes externally
  useEffect(() => {
    if (editorRef.current && !isHtmlMode && value !== lastValue) {
      const savedRange = saveSelection();
      editorRef.current.innerHTML = value;
      setLastValue(value);
      // Restore selection after a brief delay to allow DOM to update
      setTimeout(() => restoreSelection(savedRange), 0);
    }
  }, [value, isHtmlMode, lastValue]);

  return (
    <div className="rich-text-editor">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="btn-toolbar" role="toolbar">
          {!isHtmlMode && (
            <>
              <div className="btn-group btn-group-sm me-2" role="group">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('bold')}
                  title="Bold"
                >
                  <i className="bi bi-type-bold"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('italic')}
                  title="Italic"
                >
                  <i className="bi bi-type-italic"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('underline')}
                  title="Underline"
                >
                  <i className="bi bi-type-underline"></i>
                </button>
              </div>
              <div className="btn-group btn-group-sm me-2" role="group">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('formatBlock', 'h1')}
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('formatBlock', 'h2')}
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('formatBlock', 'h3')}
                  title="Heading 3"
                >
                  H3
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('formatBlock', 'p')}
                  title="Paragraph"
                >
                  P
                </button>
              </div>
              <div className="btn-group btn-group-sm me-2" role="group">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('insertUnorderedList')}
                  title="Bullet List"
                >
                  <i className="bi bi-list-ul"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => execCommand('insertOrderedList')}
                  title="Numbered List"
                >
                  <i className="bi bi-list-ol"></i>
                </button>
              </div>
              <div className="btn-group btn-group-sm me-2" role="group">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={insertLink}
                  title="Insert Link"
                >
                  <i className="bi bi-link"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={insertImage}
                  title="Insert Image"
                >
                  <i className="bi bi-image"></i>
                </button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          className={`btn btn-sm ${isHtmlMode ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setIsHtmlMode(!isHtmlMode)}
        >
          <i className={`bi ${isHtmlMode ? 'bi-eye' : 'bi-code'} me-1`}></i>
          {isHtmlMode ? 'Visual' : 'HTML'}
        </button>
      </div>
      
      {isHtmlMode ? (
        <textarea
          className="form-control"
          rows={10}
          value={value}
          onChange={handleHtmlChange}
          placeholder={placeholder}
          style={{ fontFamily: 'monospace', fontSize: '14px' }}
        />
      ) : (
        <div
          ref={editorRef}
          className="form-control"
          contentEditable
          onInput={handleWysiwygChange}
          onBlur={handleWysiwygChange}
          style={{ 
            minHeight: '200px', 
            padding: '12px',
            overflowY: 'auto'
          }}
          suppressContentEditableWarning={true}
        />
      )}
      
      <style jsx>{`
        .rich-text-editor .form-control[contenteditable] {
          height: auto;
        }
        .rich-text-editor .form-control[contenteditable]:focus {
          outline: none;
          border-color: #86b7fe;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
        }
        .rich-text-editor .form-control[contenteditable] h1,
        .rich-text-editor .form-control[contenteditable] h2,
        .rich-text-editor .form-control[contenteditable] h3 {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .rich-text-editor .form-control[contenteditable] p {
          margin-bottom: 0.5rem;
        }
        .rich-text-editor .form-control[contenteditable] ul,
        .rich-text-editor .form-control[contenteditable] ol {
          margin-bottom: 0.5rem;
          padding-left: 2rem;
        }
        .rich-text-editor .form-control[contenteditable] img {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
};

// Content Management Component
const ContentManagement: React.FC = () => {
  const [contents, setContents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverItem, setDragOverItem] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    status: 'draft', 
    menu_order: 0, 
    show_in_menu: true, 
    parent_id: '', 
    menu_title: '',
    slug: ''
  });
  const [loading, setLoading] = useState(false);

  // Load content from API
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/content');
      const result = await response.json();
      if (result.success) {
        setContents(result.data);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        title: formData.title,
        body: formData.content,
        status: formData.status,
        menu_order: parseInt(formData.menu_order.toString()) || 0,
        show_in_menu: formData.show_in_menu ? 1 : 0,
        parent_id: formData.parent_id || null,
        menu_title: formData.menu_title || null,
        slug: formData.slug || null
      };

      if (editingContent) {
        // Update existing content
        const response = await fetch(`http://localhost:3001/api/content/${editingContent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
          await loadContent(); // Reload content from server
        }
      } else {
        // Create new content
        const response = await fetch('http://localhost:3001/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
          await loadContent(); // Reload content from server
        }
      }
      setShowForm(false);
      setEditingContent(null);
      setFormData({ 
        title: '', 
        content: '', 
        status: 'draft', 
        menu_order: 0, 
        show_in_menu: true, 
        parent_id: '', 
        menu_title: '',
        slug: ''
      });
    } catch (error) {
      console.error('Error saving content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (content: any) => {
    setEditingContent(content);
    setFormData({ 
      title: content.title, 
      content: content.body || '', 
      status: content.status,
      menu_order: content.menu_order || 0,
      show_in_menu: content.show_in_menu !== 0,
      parent_id: content.parent_id || '',
      menu_title: content.menu_title || '',
      slug: content.slug || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this content?')) {
      try {
        const response = await fetch(`http://localhost:3001/api/content/${id}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
          await loadContent(); // Reload content from server
        }
      } catch (error) {
        console.error('Error deleting content:', error);
      }
    }
  };

  // Build tree structure for drag-and-drop display
  const buildMenuTree = (items: any[]) => {
    const tree: any[] = [];
    const itemMap = new Map();
    
    // Create a map of all items
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });
    
    // Build the tree structure
    items.forEach(item => {
      const treeItem = itemMap.get(item.id);
      if (item.parent_id && itemMap.has(item.parent_id)) {
        itemMap.get(item.parent_id).children.push(treeItem);
      } else {
        tree.push(treeItem);
      }
    });
    
    // Sort by menu_order
    const sortByOrder = (a: any, b: any) => (a.menu_order || 0) - (b.menu_order || 0);
    tree.sort(sortByOrder);
    tree.forEach(item => {
      if (item.children.length > 0) {
        item.children.sort(sortByOrder);
      }
    });
    
    return tree;
  };

  const flattenTree = (tree: any[], parentId: string | null = null): any[] => {
    const flattened: any[] = [];
    tree.forEach((item, index) => {
      flattened.push({
        ...item,
        parent_id: parentId,
        menu_order: index + 1
      });
      if (item.children && item.children.length > 0) {
        flattened.push(...flattenTree(item.children, item.id));
      }
    });
    return flattened;
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, item: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(item);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, dropTarget: any) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === dropTarget.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const dropPosition = e.currentTarget.getAttribute('data-drop-position') || 'child';
    
    // Create new tree structure
    const currentTree = buildMenuTree(contents);
    
    // Remove dragged item from its current position
    const removeDraggedItem = (items: any[]): any[] => {
      return items.filter(item => {
        if (item.id === draggedItem.id) {
          return false;
        }
        if (item.children) {
          item.children = removeDraggedItem(item.children);
        }
        return true;
      });
    };

    const cleanedTree = removeDraggedItem(currentTree);

    if (dropPosition === 'child') {
      // Add as child
      const addAsChild = (items: any[]): any[] => {
        return items.map(item => {
          if (item.id === dropTarget.id) {
            return {
              ...item,
              children: [...(item.children || []), { ...draggedItem, children: [] }]
            };
          }
          if (item.children) {
            item.children = addAsChild(item.children);
          }
          return item;
        });
      };
      const updatedTree = addAsChild(cleanedTree);
      await saveTreeStructure(updatedTree);
    } else {
      // Add as sibling (before or after)
      const addAsSibling = (items: any[]): any[] => {
        const newItems = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          if (item.id === dropTarget.id) {
            if (dropPosition === 'before') {
              newItems.push({ ...draggedItem, children: [] });
              newItems.push(item);
            } else {
              newItems.push(item);
              newItems.push({ ...draggedItem, children: [] });
            }
          } else {
            if (item.children) {
              item.children = addAsSibling(item.children);
            }
            newItems.push(item);
          }
        }
        return newItems;
      };
      const updatedTree = addAsSibling(cleanedTree);
      await saveTreeStructure(updatedTree);
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDropBefore = async (dropTarget: any) => {
    if (!draggedItem || draggedItem.id === dropTarget.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    console.log(`Dropping "${draggedItem.title}" before "${dropTarget.title}"`);
    
    const currentTree = buildMenuTree(contents);
    const updatedTree = moveItemBefore(currentTree, draggedItem, dropTarget);
    await saveTreeStructure(updatedTree);
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDropAfter = async (dropTarget: any) => {
    if (!draggedItem || draggedItem.id === dropTarget.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    console.log(`Dropping "${draggedItem.title}" after "${dropTarget.title}"`);
    
    const currentTree = buildMenuTree(contents);
    const updatedTree = moveItemAfter(currentTree, draggedItem, dropTarget);
    await saveTreeStructure(updatedTree);
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDropAsChild = async (dropTarget: any) => {
    if (!draggedItem || draggedItem.id === dropTarget.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    console.log(`Dropping "${draggedItem.title}" as child of "${dropTarget.title}"`);
    
    const currentTree = buildMenuTree(contents);
    const updatedTree = moveItemAsChild(currentTree, draggedItem, dropTarget);
    await saveTreeStructure(updatedTree);
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const moveItemBefore = (tree: any[], draggedItem: any, dropTarget: any): any[] => {
    // Remove dragged item from tree
    const cleanedTree = removeItemFromTree(tree, draggedItem.id);
    
    // Find and insert before target
    return insertItemBefore(cleanedTree, draggedItem, dropTarget.id);
  };

  const moveItemAfter = (tree: any[], draggedItem: any, dropTarget: any): any[] => {
    // Remove dragged item from tree
    const cleanedTree = removeItemFromTree(tree, draggedItem.id);
    
    // Find and insert after target
    return insertItemAfter(cleanedTree, draggedItem, dropTarget.id);
  };

  const moveItemAsChild = (tree: any[], draggedItem: any, dropTarget: any): any[] => {
    // Remove dragged item from tree
    const cleanedTree = removeItemFromTree(tree, draggedItem.id);
    
    // Find and insert as child
    return insertItemAsChild(cleanedTree, draggedItem, dropTarget.id);
  };

  const removeItemFromTree = (tree: any[], itemId: string): any[] => {
    return tree.filter(item => {
      if (item.id === itemId) {
        return false;
      }
      if (item.children) {
        item.children = removeItemFromTree(item.children, itemId);
      }
      return true;
    });
  };

  const insertItemBefore = (tree: any[], draggedItem: any, targetId: string): any[] => {
    const newTree = [];
    for (const item of tree) {
      if (item.id === targetId) {
        newTree.push({ ...draggedItem, children: [] });
        newTree.push(item);
      } else {
        if (item.children) {
          item.children = insertItemBefore(item.children, draggedItem, targetId);
        }
        newTree.push(item);
      }
    }
    return newTree;
  };

  const insertItemAfter = (tree: any[], draggedItem: any, targetId: string): any[] => {
    const newTree = [];
    for (const item of tree) {
      newTree.push(item);
      if (item.id === targetId) {
        newTree.push({ ...draggedItem, children: [] });
      } else if (item.children) {
        item.children = insertItemAfter(item.children, draggedItem, targetId);
      }
    }
    return newTree;
  };

  const insertItemAsChild = (tree: any[], draggedItem: any, targetId: string): any[] => {
    return tree.map(item => {
      if (item.id === targetId) {
        return {
          ...item,
          children: [...(item.children || []), { ...draggedItem, children: [] }]
        };
      }
      if (item.children) {
        item.children = insertItemAsChild(item.children, draggedItem, targetId);
      }
      return item;
    });
  };

  const saveTreeStructure = async (tree: any[]) => {
    setLoading(true);
    try {
      const flattened = flattenTree(tree);
      console.log('🔄 Saving tree structure:', flattened);
      
      const response = await fetch('http://localhost:3001/api/content/bulk-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: flattened })
      });

      const result = await response.json();
      console.log('📡 API Response:', result);
      
      if (result.success) {
        console.log('✅ Tree structure saved successfully');
        await loadContent(); // Reload content from server
      } else {
        console.error('❌ Failed to reorder content:', result.error);
      }
    } catch (error) {
      console.error('💥 Error reordering content:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContentItem = (item: any, level: number = 0) => {
    const isDragging = draggedItem?.id === item.id;

    return (
      <div key={item.id} className={`content-item ${isDragging ? 'dragging' : ''}`}>
        {/* Simple drop zone before */}
        {draggedItem && draggedItem.id !== item.id && (
          <div
            className="drop-zone"
            onClick={() => {
              if (draggedItem && draggedItem.id !== item.id) {
                console.log(`📦 DROP BEFORE: "${draggedItem.title}" → before "${item.title}"`);
                handleDropBefore(item);
              }
            }}
            style={{ cursor: draggedItem ? 'pointer' : 'default' }}
          >
            <div className="drop-indicator">
              ⬆️ Click to place "{draggedItem?.title}" before "{item.menu_title || item.title}"
            </div>
          </div>
        )}

        <div
          className={`content-list-item ${isDragging ? 'being-dragged' : ''}`}
          onClick={() => {
            if (draggedItem && draggedItem.id !== item.id) {
              console.log(`📦 DROP AS CHILD: "${draggedItem.title}" → "${item.title}"`);
              handleDropAsChild(item);
            }
          }}
          style={{ 
            paddingLeft: `${1 + level * 2}rem`,
            borderLeft: level > 0 ? '3px solid #dee2e6' : 'none',
            marginBottom: '4px',
            opacity: isDragging ? 0.5 : 1,
            cursor: draggedItem && draggedItem.id !== item.id ? 'pointer' : 'default',
            backgroundColor: draggedItem && draggedItem.id !== item.id ? 'rgba(13, 110, 253, 0.05)' : 'white'
          }}
        >
          <div className="d-flex justify-content-between align-items-center p-3">
            <div className="d-flex align-items-center flex-grow-1">
              <button
                className="btn btn-sm btn-outline-secondary me-3 drag-handle"
                onClick={() => {
                  if (draggedItem) {
                    // Cancel drag
                    console.log('❌ CANCEL DRAG');
                    setDraggedItem(null);
                    setDragOverItem(null);
                  } else {
                    // Start drag
                    console.log(`🎯 START DRAG: "${item.title}"`);
                    setDraggedItem(item);
                  }
                }}
                title={draggedItem ? 'Cancel drag' : 'Click to drag this item'}
                style={{ 
                  fontSize: '12px',
                  padding: '4px 8px'
                }}
              >
                {draggedItem?.id === item.id ? (
                  <>❌ Cancel</>
                ) : (
                  <>⋮⋮ Drag</>
                )}
              </button>
              
              {item.children && item.children.length > 0 && (
                <i className="bi bi-folder me-2 text-primary"></i>
              )}
              
              <div className="flex-grow-1">
                <div className="d-flex align-items-center mb-1">
                  <strong className="me-2">{item.menu_title || item.title}</strong>
                  <span className={`badge me-2 ${item.status === 'published' ? 'bg-success' : 'bg-warning'}`}>
                    {item.status}
                  </span>
                  {!item.show_in_menu && (
                    <span className="badge bg-secondary me-2">Hidden</span>
                  )}
                </div>
                <small className="text-muted">
                  Order: {item.menu_order || 0} | 
                  Last modified: {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Never'}
                </small>
              </div>
            </div>
            
            <div className="btn-group btn-group-sm">
              <button 
                className="btn btn-outline-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(item);
                }}
                title="Edit content"
              >
                <i className="bi bi-pencil"></i>
              </button>
              <button 
                className="btn btn-outline-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                title="Delete content"
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Render children */}
        {item.children && item.children.map((child: any) => renderContentItem(child, level + 1))}

        {/* Simple drop zone after */}
        {draggedItem && draggedItem.id !== item.id && (
          <div
            className="drop-zone"
            onClick={() => {
              if (draggedItem && draggedItem.id !== item.id) {
                console.log(`📦 DROP AFTER: "${draggedItem.title}" → after "${item.title}"`);
                handleDropAfter(item);
              }
            }}
            style={{ cursor: draggedItem ? 'pointer' : 'default' }}
          >
            <div className="drop-indicator">
              ⬇️ Click to place "{draggedItem?.title}" after "{item.menu_title || item.title}"
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3><i className="bi bi-file-text me-2"></i>Content Management</h3>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>New Content
        </button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5>{editingContent ? 'Edit Content' : 'Create New Content'}</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Content</label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData({...formData, content})}
                  placeholder="Enter your content here..."
                />
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">URL Slug (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    placeholder="custom-url-slug"
                  />
                  <small className="form-text text-muted">Leave blank to auto-generate from title</small>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Menu Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.menu_order}
                    onChange={(e) => setFormData({...formData, menu_order: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                  <small className="form-text text-muted">Lower numbers appear first in menu</small>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Menu Title (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.menu_title}
                    onChange={(e) => setFormData({...formData, menu_title: e.target.value})}
                    placeholder="Different title for menu"
                  />
                  <small className="form-text text-muted">Leave blank to use main title</small>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Parent Page</label>
                  <select
                    className="form-select"
                    value={formData.parent_id}
                    onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                  >
                    <option value="">No Parent (Top Level)</option>
                    {contents
                      .filter(c => c.id !== editingContent?.id) // Don't allow self as parent
                      .map(content => (
                        <option key={content.id} value={content.id}>
                          {content.menu_title || content.title}
                        </option>
                      ))
                    }
                  </select>
                  <small className="form-text text-muted">Create nested menu structure</small>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="form-check mt-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="showInMenu"
                      checked={formData.show_in_menu}
                      onChange={(e) => setFormData({...formData, show_in_menu: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="showInMenu">
                      Show in Menu
                    </label>
                    <small className="form-text text-muted d-block">
                      Uncheck to hide from menu (accessible via direct URL only)
                    </small>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>Save
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingContent(null);
                    setFormData({ 
                      title: '', 
                      content: '', 
                      status: 'draft', 
                      menu_order: 0, 
                      show_in_menu: true, 
                      parent_id: '', 
                      menu_title: '',
                      slug: ''
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-list-nested me-2"></i>
              Content Pages (Drag to reorder and organise)
            </h6>
            <div className="d-flex align-items-center">
              <small className="text-muted me-3">
                <i className="bi bi-info-circle me-1"></i>
                Drag pages to reorder or create nested menu structure
              </small>
              {draggedItem && (
                <small className="text-primary">
                  <i className="bi bi-cursor-fill me-1"></i>
                  Dragging: "{draggedItem.title}"
                </small>
              )}
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {contents.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-file-text fs-1 text-muted mb-3"></i>
              <h5>No content pages yet</h5>
              <p className="text-muted">Create your first page to get started</p>
            </div>
          ) : (
            <div className="content-drag-list">
              {buildMenuTree(contents).map(item => renderContentItem(item))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .content-item {
          position: relative;
        }
        
        .content-item.dragging {
          opacity: 0.3;
        }
        
        .content-list-item {
          border: 2px solid #dee2e6;
          border-radius: 8px;
          background-color: white;
          transition: all 0.2s ease;
          cursor: move;
        }
        
        .content-list-item:hover {
          background-color: #f8f9fa;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-color: #0d6efd;
        }
        
        .content-list-item.being-dragged {
          opacity: 0.6;
          transform: rotate(3deg) scale(1.02);
          cursor: grabbing;
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
          border-color: #0d6efd;
          z-index: 1000;
        }
        
        .drop-zone {
          height: 40px;
          margin: 8px 0;
          border-radius: 8px;
          background-color: rgba(13, 110, 253, 0.1);
          border: 3px dashed #0d6efd;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          opacity: 0.8;
        }
        
        .drop-zone:hover {
          opacity: 1;
          background-color: rgba(13, 110, 253, 0.2);
          border-color: #0a58ca;
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(13, 110, 253, 0.3);
        }
        
        .drop-indicator {
          color: #0d6efd;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          padding: 0 1rem;
        }
        
        .content-drag-list {
          max-height: 70vh;
          overflow-y: auto;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        .drag-handle {
          cursor: grab !important;
          padding: 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .drag-handle:hover {
          color: #0d6efd !important;
          background-color: rgba(13, 110, 253, 0.1);
          transform: scale(1.1);
        }
        
        .drag-handle:active {
          cursor: grabbing !important;
          background-color: rgba(13, 110, 253, 0.2);
        }
        
        /* Scrollbar styling */
        .content-drag-list::-webkit-scrollbar {
          width: 10px;
        }
        
        .content-drag-list::-webkit-scrollbar-track {
          background: #e9ecef;
          border-radius: 5px;
        }
        
        .content-drag-list::-webkit-scrollbar-thumb {
          background: #adb5bd;
          border-radius: 5px;
        }
        
        .content-drag-list::-webkit-scrollbar-thumb:hover {
          background: #6c757d;
        }
      `}</style>
    </div>
  );
};

// Document Management Component
const DocumentManagement: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load documents from API
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/documents');
      const result = await response.json();
      if (result.success) {
        setDocuments(result.data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // For now, create a mock document since we don't have actual file upload
      const formData = new FormData(e.target as HTMLFormElement);
      const fileInput = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
      const descInput = (e.target as HTMLFormElement).querySelector('input[type="text"]') as HTMLInputElement;
      
      const file = fileInput?.files?.[0];
      const description = descInput?.value || '';
      
      if (file) {
        const response = await fetch('http://localhost:3001/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: description || file.name,
            filename: file.name,
            size: file.size,
            mimetype: file.type
          })
        });
        const result = await response.json();
        if (result.success) {
          await loadDocuments(); // Reload documents from server
        }
      }
      setShowUpload(false);
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        const response = await fetch(`http://localhost:3001/api/documents/${id}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
          await loadDocuments(); // Reload documents from server
        }
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3><i className="bi bi-folder me-2"></i>Document Management</h3>
        <button 
          className="btn btn-success"
          onClick={() => setShowUpload(true)}
        >
          <i className="bi bi-upload me-2"></i>Upload Document
        </button>
      </div>

      {showUpload && (
        <div className="card mb-4">
          <div className="card-header">
            <h5>Upload New Document</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleFileUpload}>
              <div className="mb-3">
                <label className="form-label">Select File</label>
                <input type="file" className="form-control" accept=".pdf,.doc,.docx,.xls,.xlsx" />
              </div>
              <div className="mb-3">
                <label className="form-label">Description (Optional)</label>
                <input type="text" className="form-control" placeholder="Brief description of the document" />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-upload me-2"></i>Upload
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => {
                  const getFileType = (mimetype: string) => {
                    if (mimetype?.includes('pdf')) return 'PDF';
                    if (mimetype?.includes('excel') || mimetype?.includes('spreadsheet')) return 'Excel';
                    if (mimetype?.includes('word') || mimetype?.includes('document')) return 'Word';
                    return 'File';
                  };
                  
                  const formatSize = (bytes: number) => {
                    if (bytes < 1024) return bytes + ' B';
                    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
                    return Math.round(bytes / (1024 * 1024)) + ' MB';
                  };
                  
                  const fileType = getFileType(doc.mimetype);
                  
                  return (
                    <tr key={doc.id}>
                      <td>
                        <i className={`bi ${fileType === 'PDF' ? 'bi-file-pdf' : fileType === 'Excel' ? 'bi-file-excel' : 'bi-file-word'} me-2 text-primary`}></i>
                        {doc.title || doc.filename}
                      </td>
                      <td>{fileType}</td>
                      <td>{formatSize(doc.size || 0)}</td>
                      <td>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary">
                            <i className="bi bi-download"></i>
                          </button>
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Management Component
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ username: '', email: '', role: 'read-only', password: '' });
  const [loading, setLoading] = useState(false);

  // Load users from API
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/users');
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingUser) {
        // Update existing user
        const response = await fetch(`http://localhost:3001/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
          await loadUsers(); // Reload users from server
        }
      } else {
        // Create new user
        const response = await fetch('http://localhost:3001/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
          await loadUsers(); // Reload users from server
        }
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ username: '', email: '', role: 'read-only', password: '' });
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({ username: user.username, email: user.email, role: user.role, password: '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await fetch(`http://localhost:3001/api/users/${id}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
          await loadUsers(); // Reload users from server
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3><i className="bi bi-people me-2"></i>User Management</h3>
        <button 
          className="btn btn-warning"
          onClick={() => setShowForm(true)}
        >
          <i className="bi bi-person-plus me-2"></i>Add User
        </button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5>{editingUser ? 'Edit User' : 'Create New User'}</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="read-only">Read Only</option>
                    <option value="editor">Editor</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">{editingUser ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                  />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>Save
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    setFormData({ username: '', email: '', role: 'read-only', password: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <i className="bi bi-person-circle me-2"></i>
                      {user.username}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${
                        user.role === 'administrator' ? 'bg-danger' : 
                        user.role === 'editor' ? 'bg-warning' : 'bg-info'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-success">active</span>
                    </td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => handleEdit(user)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.username === 'admin'}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};



const AppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-3">Loading CMS...</div>
        </div>
      </div>
    );
  }

  const handleAdminLoginClick = () => {
    setShowAdminLogin(true);
  };

  const handleBackToPublic = () => {
    setShowAdminLogin(false);
  };

  const handleLogout = () => {
    logout();
    setShowAdminLogin(false);
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow">
        <div className="container">
          <a 
            className="navbar-brand" 
            href="#" 
            onClick={(e) => { 
              e.preventDefault(); 
              if (!user) handleBackToPublic(); 
            }}
          >
            <i className="bi bi-globe me-2"></i>
            Web Communication CMS
          </a>
          
          <div className="navbar-nav ms-auto">
            {user ? (
              <div className="d-flex align-items-center">
                <span className="navbar-text me-3">
                  <i className="bi bi-person-circle me-2"></i>
                  {user.username}
                </span>
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Logout
                </button>
              </div>
            ) : (
              !showAdminLogin && (
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={handleAdminLoginClick}
                >
                  <i className="bi bi-shield-lock me-1"></i>
                  Admin Login
                </button>
              )
            )}
          </div>
        </div>
      </nav>
      
      <div className="container mt-4">
        {user ? (
          <AppRouter />
        ) : showAdminLogin ? (
          <AdminLoginForm onBack={handleBackToPublic} />
        ) : (
          <PublicContentDisplay />
        )}
      </div>
      
      <footer className="bg-dark text-light text-center py-3 mt-5">
        <div className="container">
          <small>
            <i className="bi bi-c-circle me-1"></i>
            2025 Web Communication CMS
            {user && <span className="text-warning ms-2">- Admin Mode</span>}
          </small>
        </div>
      </footer>
    </div>
  );
};

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <style jsx global>{`
        .content-display h1,
        .content-display h2,
        .content-display h3,
        .content-display h4,
        .content-display h5,
        .content-display h6 {
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        
        .content-display h1 { font-size: 2rem; }
        .content-display h2 { font-size: 1.75rem; }
        .content-display h3 { font-size: 1.5rem; }
        
        .content-display p {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        
        .content-display ul,
        .content-display ol {
          margin-bottom: 1rem;
          padding-left: 2rem;
        }
        
        .content-display li {
          margin-bottom: 0.5rem;
        }
        
        .content-display img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 1rem 0;
        }
        
        .content-display a {
          color: #0d6efd;
          text-decoration: none;
        }
        
        .content-display a:hover {
          text-decoration: underline;
        }
        
        .content-display blockquote {
          border-left: 4px solid #dee2e6;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6c757d;
        }
        
        .content-display code {
          background-color: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
        }
        
        .content-display pre {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
      `}</style>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;