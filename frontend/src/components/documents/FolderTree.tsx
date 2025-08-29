import React, { useState, useEffect, useCallback } from 'react';
import { FolderTreeNode, Folder } from '../../types';
import { folderService } from '../../services';
import { Button, LoadingSpinner, ErrorMessage } from '../ui';
import Breadcrumb, { BreadcrumbItem } from '../ui/Breadcrumb';
import { useFolderOperations } from './FolderOperations';
import './FolderTree.css';

// Utility function to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface FolderTreeProps {
  selectedFolderId?: string | null;
  onFolderSelect?: (folder: Folder | null) => void;
  onFolderCreate?: (parentId: string | null) => void;
  onFolderEdit?: (folder: Folder) => void;
  onFolderDelete?: (folder: Folder) => void;
  showActions?: boolean;
  showCreateRoot?: boolean;
  showBreadcrumbs?: boolean;
  className?: string;
}

interface FolderTreeNodeProps {
  node: FolderTreeNode;
  level: number;
  selectedFolderId?: string | null;
  onFolderSelect?: (folder: Folder | null) => void;
  onFolderCreate?: (parentId: string | null) => void;
  onFolderEdit?: (folder: Folder) => void;
  onFolderDelete?: (folder: Folder) => void;
  showActions?: boolean;
  expandedFolders: Set<string>;
  onToggleExpanded: (folderId: string) => void;
}

const FolderTreeNodeComponent: React.FC<FolderTreeNodeProps> = ({
  node,
  level,
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  showActions = true,
  expandedFolders,
  onToggleExpanded,
}) => {
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedFolderId === node.id;
  const hasChildren = node.children.length > 0;

  const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(node.id);
  }, [node.id, onToggleExpanded]);

  const handleFolderClick = useCallback(() => {
    onFolderSelect?.(node);
  }, [node, onFolderSelect]);

  const handleCreateSubfolder = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFolderCreate?.(node.id);
  }, [node.id, onFolderCreate]);

  const handleEditFolder = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFolderEdit?.(node);
  }, [node, onFolderEdit]);

  const handleDeleteFolder = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFolderDelete?.(node);
  }, [node, onFolderDelete]);

  return (
    <div className="folder-tree-node">
      <div
        className={`folder-tree-node__item ${isSelected ? 'folder-tree-node__item--selected' : ''}`}
        style={{ paddingLeft: `${level * 1.5}rem` }}
        onClick={handleFolderClick}
        role="button"
        tabIndex={0}
        aria-selected={isSelected}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFolderClick();
          }
        }}
      >
        <div className="folder-tree-node__content">
          {hasChildren && (
            <button
              className="folder-tree-node__toggle"
              onClick={handleToggleExpanded}
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="folder-tree-node__spacer" />}
          
          <div className="folder-tree-node__icon" aria-hidden="true">
            {node.isPublic ? '📂' : '🔒'}
          </div>
          
          <span className="folder-tree-node__name">{node.name}</span>
          
          {(node.documentCount !== undefined || node.totalSize !== undefined) && (
            <div className="folder-tree-node__stats">
              {node.documentCount !== undefined && (
                <span className="folder-tree-node__count">
                  {node.documentCount} files
                </span>
              )}
              {node.totalSize !== undefined && (
                <span className="folder-tree-node__size">
                  {formatFileSize(node.totalSize)}
                </span>
              )}
            </div>
          )}
        </div>

        {showActions && (
          <div className="folder-tree-node__actions">
            <Button
              variant="ghost"
              size="small"
              onClick={handleCreateSubfolder}
              aria-label={`Create subfolder in ${node.name}`}
              title="Create subfolder"
            >
              ➕
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={handleEditFolder}
              aria-label={`Edit ${node.name}`}
              title="Edit folder"
            >
              ✏️
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={handleDeleteFolder}
              aria-label={`Delete ${node.name}`}
              title="Delete folder"
            >
              🗑️
            </Button>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="folder-tree-node__children">
          {node.children.map((child) => (
            <FolderTreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              selectedFolderId={selectedFolderId || null}
              onFolderSelect={onFolderSelect}
              onFolderCreate={onFolderCreate}
              onFolderEdit={onFolderEdit}
              onFolderDelete={onFolderDelete}
              showActions={showActions}
              expandedFolders={expandedFolders}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FolderTree: React.FC<FolderTreeProps> = ({
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  showActions = true,
  showCreateRoot = true,
  showBreadcrumbs = true,
  className = '',
}) => {
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Folder operations integration
  const {
    openCreateModal,
    openEditModal,
    openDeleteModal,
    modals
  } = useFolderOperations({
    onFolderCreated: (folder) => {
      loadFolderTree();
      onFolderCreate?.(folder.parentId);
    },
    onFolderUpdated: (folder) => {
      loadFolderTree();
      onFolderEdit?.(folder);
    },
    onFolderDeleted: (folderId) => {
      loadFolderTree();
      // If the deleted folder was selected, clear selection
      if (selectedFolderId === folderId) {
        onFolderSelect?.(null);
      }
      onFolderDelete?.(folderTree.find(f => f.id === folderId) as Folder);
    },
    onError: (error) => {
      setError(error);
    }
  });

  const loadFolderTree = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tree = await folderService.getFolderTree();
      setFolderTree(tree);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load folder tree';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBreadcrumbPath = useCallback(async (folderId: string | null) => {
    if (!folderId) {
      setBreadcrumbPath([]);
      return;
    }

    try {
      const path = await folderService.getFolderPath(folderId);
      const breadcrumbs: BreadcrumbItem[] = path.map(folder => ({
        id: folder.id,
        name: folder.name,
        path: folder.id
      }));
      setBreadcrumbPath(breadcrumbs);
    } catch (err) {
      console.error('Failed to load folder path:', err);
      setBreadcrumbPath([]);
    }
  }, []);

  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

  useEffect(() => {
    if (showBreadcrumbs) {
      loadBreadcrumbPath(selectedFolderId || null);
    }
  }, [selectedFolderId, showBreadcrumbs, loadBreadcrumbPath]);

  const handleToggleExpanded = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const getAllFolderIds = (nodes: FolderTreeNode[]): string[] => {
      const ids: string[] = [];
      nodes.forEach(node => {
        ids.push(node.id);
        if (node.children.length > 0) {
          ids.push(...getAllFolderIds(node.children));
        }
      });
      return ids;
    };

    setExpandedFolders(new Set(getAllFolderIds(folderTree)));
  }, [folderTree]);

  const handleCollapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const handleCreateRootFolder = useCallback(() => {
    openCreateModal(null);
  }, [openCreateModal]);

  const handleFolderCreate = useCallback((parentId: string | null) => {
    openCreateModal(parentId);
  }, [openCreateModal]);

  const handleFolderEdit = useCallback((folder: Folder) => {
    openEditModal(folder);
  }, [openEditModal]);

  const handleFolderDelete = useCallback((folder: Folder) => {
    openDeleteModal(folder);
  }, [openDeleteModal]);

  const handleClearSelection = useCallback(() => {
    onFolderSelect?.(null);
  }, [onFolderSelect]);

  const handleBreadcrumbClick = useCallback((item: BreadcrumbItem) => {
    // Find the folder in the tree to get the full folder object
    const findFolderById = (nodes: FolderTreeNode[], id: string): Folder | null => {
      for (const node of nodes) {
        if (node.id === id) {
          return node;
        }
        const found = findFolderById(node.children, id);
        if (found) return found;
      }
      return null;
    };

    const folder = findFolderById(folderTree, item.id);
    if (folder) {
      onFolderSelect?.(folder);
    }
  }, [folderTree, onFolderSelect]);



  if (isLoading) {
    return (
      <div className={`folder-tree ${className}`}>
        <div className="folder-tree__loading">
          <LoadingSpinner />
          <p>Loading folders...</p>
        </div>
      </div>
    );
  }

  // Auto-expand path to selected folder
  useEffect(() => {
    if (selectedFolderId && breadcrumbPath.length > 0) {
      const pathIds = breadcrumbPath.map(item => item.id);
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        pathIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [selectedFolderId, breadcrumbPath]);

  if (error) {
    return (
      <div className={`folder-tree ${className}`}>
        <ErrorMessage 
          message={error}
          onDismiss={() => setError(null)}
        />
        <Button onClick={loadFolderTree} className="folder-tree__retry">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={`folder-tree ${className}`}>
        <div className="folder-tree__header">
          <h3 className="folder-tree__title">Folders</h3>
          <div className="folder-tree__actions">
            {folderTree.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleExpandAll}
                  title="Expand all folders"
                >
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleCollapseAll}
                  title="Collapse all folders"
                >
                  Collapse All
                </Button>
              </>
            )}
            {showCreateRoot && (
              <Button
                variant="ghost"
                size="small"
                onClick={handleCreateRootFolder}
                title="Create new root folder"
              >
                ➕ New Folder
              </Button>
            )}
          </div>
        </div>

      <div className="folder-tree__content">
        {showBreadcrumbs && breadcrumbPath.length > 0 && (
          <div className="folder-tree__breadcrumbs">
            <Breadcrumb
              items={breadcrumbPath}
              onItemClick={handleBreadcrumbClick}
              showRoot={true}
              rootLabel="All Folders"
            />
          </div>
        )}

        {selectedFolderId && (
          <div className="folder-tree__selection">
            <Button
              variant="ghost"
              size="small"
              onClick={handleClearSelection}
              className="folder-tree__clear-selection"
            >
              📁 All Folders
            </Button>
          </div>
        )}

        {folderTree.length === 0 ? (
          <div className="folder-tree__empty">
            <p>No folders found</p>
            {showCreateRoot && (
              <Button onClick={handleCreateRootFolder}>
                Create First Folder
              </Button>
            )}
          </div>
        ) : (
          <div className="folder-tree__nodes" role="tree">
            {folderTree.map((node) => (
              <FolderTreeNodeComponent
                key={node.id}
                node={node}
                level={0}
                selectedFolderId={selectedFolderId || null}
                onFolderSelect={onFolderSelect}
                onFolderCreate={handleFolderCreate}
                onFolderEdit={handleFolderEdit}
                onFolderDelete={handleFolderDelete}
                showActions={showActions}
                expandedFolders={expandedFolders}
                onToggleExpanded={handleToggleExpanded}
              />
            ))}
          </div>
        )}
      </div>
      </div>
      
      {/* Folder operation modals */}
      {modals}
    </>
  );
};

export default FolderTree;