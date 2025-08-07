import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { folderService } from '../../services';
import { FolderTreeNode, Folder } from '../../types';
import './FolderTree.css';

interface FolderTreeProps {
  selectedFolderId?: string | null;
  onFolderSelect?: (folder: Folder | null) => void;
  onFolderCreate?: (parentId: string | null) => void;
  onFolderEdit?: (folder: Folder) => void;
  onFolderDelete?: (folder: Folder) => void;
  showActions?: boolean;
  showCreateRoot?: boolean;
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
              selectedFolderId={selectedFolderId}
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
  className = '',
}) => {
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

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
    onFolderCreate?.(null);
  }, [onFolderCreate]);

  const handleClearSelection = useCallback(() => {
    onFolderSelect?.(null);
  }, [onFolderSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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
                selectedFolderId={selectedFolderId}
                onFolderSelect={onFolderSelect}
                onFolderCreate={onFolderCreate}
                onFolderEdit={onFolderEdit}
                onFolderDelete={onFolderDelete}
                showActions={showActions}
                expandedFolders={expandedFolders}
                onToggleExpanded={handleToggleExpanded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderTree;