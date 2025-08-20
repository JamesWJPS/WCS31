import React, { useState, useEffect, useCallback } from 'react';
import { ContentItem } from '../../types';
import './DragDropMenuManager.css';

interface DragDropMenuManagerProps {
  contents: ContentItem[];
  onMenuUpdate: (updates: MenuUpdate[]) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

interface MenuUpdate {
  id: string;
  menu_order: number;
  parent_id?: string | null;
  show_in_menu?: boolean | number;
}

interface DragItem {
  id: string;
  type: 'menu-item';
  originalIndex: number;
  parentId?: string | null;
}

interface MenuTreeItem extends ContentItem {
  children: MenuTreeItem[];
  level: number;
}

const DragDropMenuManager: React.FC<DragDropMenuManagerProps> = ({
  contents,
  onMenuUpdate,
  onClose,
  loading = false
}) => {
  const [menuTree, setMenuTree] = useState<MenuTreeItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Build hierarchical menu tree
  const buildMenuTree = useCallback((items: ContentItem[]): MenuTreeItem[] => {
    const tree: MenuTreeItem[] = [];
    const itemMap = new Map<string, MenuTreeItem>();
    
    // Create a map of all items with children array
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [], level: 0 });
    });
    
    // Build the tree structure
    items.forEach(item => {
      const treeItem = itemMap.get(item.id)!;
      if (item.parent_id && itemMap.has(item.parent_id)) {
        const parent = itemMap.get(item.parent_id)!;
        treeItem.level = parent.level + 1;
        parent.children.push(treeItem);
      } else {
        tree.push(treeItem);
      }
    });
    
    // Sort by menu_order
    const sortByOrder = (a: MenuTreeItem, b: MenuTreeItem) => 
      (a.menu_order || 0) - (b.menu_order || 0);
    
    const sortRecursively = (items: MenuTreeItem[]) => {
      items.sort(sortByOrder);
      items.forEach(item => {
        if (item.children.length > 0) {
          sortRecursively(item.children);
        }
      });
    };
    
    sortRecursively(tree);
    return tree;
  }, []);

  useEffect(() => {
    setMenuTree(buildMenuTree(contents));
  }, [contents, buildMenuTree]);

  const handleDragStart = (e: React.DragEvent, item: MenuTreeItem, index: number) => {
    const dragData: DragItem = {
      id: item.id,
      type: 'menu-item',
      originalIndex: index,
      parentId: item.parent_id
    };
    
    setDraggedItem(dragData);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    
    // Add visual feedback
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedItem(null);
    setDragOverItem(null);
    setDragOverPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: MenuTreeItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    let position: 'before' | 'after' | 'inside' = 'after';
    
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }
    
    setDragOverItem(targetItem.id);
    setDragOverPosition(position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the entire item, not just moving between child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverItem(null);
      setDragOverPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetItem: MenuTreeItem) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    
    console.log('Drop detected:', draggedItem.id, 'onto', targetItem.id, 'position:', dragOverPosition);
    
    const newTree = [...menuTree];
    const updates: MenuUpdate[] = [];
    
    // Find and remove the dragged item from its current position
    const removeDraggedItem = (items: MenuTreeItem[], parentId?: string | null): MenuTreeItem | null => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === draggedItem.id) {
          return items.splice(i, 1)[0];
        }
        const found = removeDraggedItem(items[i].children, items[i].id);
        if (found) return found;
      }
      return null;
    };
    
    const draggedTreeItem = removeDraggedItem(newTree);
    if (!draggedTreeItem) return;
    
    // Find the target item and insert the dragged item
    const insertDraggedItem = (items: MenuTreeItem[], parentId?: string | null): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === targetItem.id) {
          let insertIndex = i;
          let newParentId = parentId;
          
          if (dragOverPosition === 'before') {
            insertIndex = i;
          } else if (dragOverPosition === 'after') {
            insertIndex = i + 1;
          } else if (dragOverPosition === 'inside') {
            items[i].children.push(draggedTreeItem);
            newParentId = targetItem.id;
            draggedTreeItem.parent_id = newParentId;
            draggedTreeItem.level = items[i].level + 1;
            
            // Update menu order for the new child
            updates.push({
              id: draggedTreeItem.id,
              menu_order: items[i].children.length - 1,
              parent_id: newParentId
            });
            
            return true;
          }
          
          if (dragOverPosition !== 'inside') {
            items.splice(insertIndex, 0, draggedTreeItem);
            draggedTreeItem.parent_id = newParentId;
            draggedTreeItem.level = parentId ? (items.find(item => item.id === parentId)?.level || 0) + 1 : 0;
            
            // Update menu order for the moved item
            updates.push({
              id: draggedTreeItem.id,
              menu_order: insertIndex,
              parent_id: newParentId
            });
          }
          
          return true;
        }
        
        if (insertDraggedItem(items[i].children, items[i].id)) {
          return true;
        }
      }
      return false;
    };
    
    insertDraggedItem(newTree);
    
    // Update menu orders for all affected items
    const updateMenuOrders = (items: MenuTreeItem[], parentId?: string | null) => {
      items.forEach((item, index) => {
        if (item.menu_order !== index || item.parent_id !== parentId) {
          updates.push({
            id: item.id,
            menu_order: index,
            parent_id: parentId || null
          });
        }
        updateMenuOrders(item.children, item.id);
      });
    };
    
    updateMenuOrders(newTree);
    
    setMenuTree(newTree);
    setHasChanges(true);
    console.log('Changes detected, hasChanges set to true');
    setDragOverItem(null);
    setDragOverPosition(null);
  };

  const toggleVisibility = (itemId: string) => {
    console.log('Toggling visibility for item:', itemId);
    const updateVisibility = (items: MenuTreeItem[]): boolean => {
      for (const item of items) {
        if (item.id === itemId) {
          const oldValue = item.show_in_menu;
          item.show_in_menu = item.show_in_menu ? 0 : 1;
          console.log('Visibility changed from', oldValue, 'to', item.show_in_menu);
          setHasChanges(true);
          console.log('Changes detected from visibility toggle, hasChanges set to true');
          return true;
        }
        if (updateVisibility(item.children)) {
          return true;
        }
      }
      return false;
    };
    
    const newTree = [...menuTree];
    updateVisibility(newTree);
    setMenuTree(newTree);
  };

  const handleSave = async () => {
    console.log('handleSave called, hasChanges:', hasChanges);
    if (!hasChanges) {
      console.log('No changes to save');
      return;
    }
    
    setSaving(true);
    try {
      const updates: MenuUpdate[] = [];
      
      const collectUpdates = (items: MenuTreeItem[], parentId?: string | null) => {
        items.forEach((item, index) => {
          updates.push({
            id: item.id,
            menu_order: index,
            parent_id: parentId || null,
            show_in_menu: item.show_in_menu
          });
          collectUpdates(item.children, item.id);
        });
      };
      
      collectUpdates(menuTree);
      
      console.log('Sending updates:', updates);
      await onMenuUpdate(updates);
      setHasChanges(false);
      console.log('Menu updates saved successfully');
    } catch (error) {
      console.error('Failed to save menu changes:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Check if it's an API error with more details
      if (error && typeof error === 'object' && 'statusCode' in error) {
        errorMessage += ` (Status: ${(error as any).statusCode})`;
      }
      alert('Failed to save menu changes: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const renderMenuItem = (item: MenuTreeItem, index: number, parentItems: MenuTreeItem[]) => {
    const isDragOver = dragOverItem === item.id;
    const isHidden = !item.show_in_menu || item.show_in_menu === 0;
    const isDraft = item.status === 'draft';
    
    return (
      <div key={item.id} className="menu-manager-item-wrapper">
        {/* Drop zone before item */}
        {isDragOver && dragOverPosition === 'before' && (
          <div className="drop-indicator before" />
        )}
        
        <div
          className={`menu-manager-item ${isDragOver && dragOverPosition === 'inside' ? 'drag-over-inside' : ''} ${isHidden ? 'hidden' : ''} ${isDraft ? 'draft' : ''}`}
          style={{ paddingLeft: `${item.level * 20 + 10}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, item, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, item)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item)}
        >
          <div className="menu-item-content">
            <div className="drag-handle">
              <i className="bi bi-grip-vertical"></i>
            </div>
            
            <div className="menu-item-info">
              <div className="menu-item-title">
                {item.menu_title || item.title}
                {isDraft && <span className="badge badge-draft ms-2">Draft</span>}
              </div>
              <div className="menu-item-details">
                <small className="text-muted">
                  /{item.slug} • Order: {item.menu_order || 0}
                  {item.parent_id && ' • Child'}
                </small>
              </div>
            </div>
            
            <div className="menu-item-controls">
              <button
                className={`btn btn-sm ${isHidden ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                onClick={() => toggleVisibility(item.id)}
                title={isHidden ? 'Show in menu' : 'Hide from menu'}
              >
                <i className={`bi ${isHidden ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>
        </div>
        
        {/* Drop zone after item */}
        {isDragOver && dragOverPosition === 'after' && (
          <div className="drop-indicator after" />
        )}
        
        {/* Render children */}
        {item.children.length > 0 && (
          <div className="menu-item-children">
            {item.children.map((child, childIndex) => 
              renderMenuItem(child, childIndex, item.children)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="menu-manager-overlay">
      <div className="menu-manager-modal">
        <div className="menu-manager-header">
          <h5>
            <i className="bi bi-list-ul me-2"></i>
            Manage Menu Order
          </h5>
          <button
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>
        
        <div className="menu-manager-body">
          <div className="menu-manager-instructions">
            <p>
              <i className="bi bi-info-circle me-2"></i>
              Drag and drop pages to reorder them. Drop on a page to make it a child, or between pages to reorder.
            </p>
            <button 
              className="btn btn-sm btn-outline-warning" 
              onClick={() => {
                console.log('Test button clicked, setting hasChanges to true');
                setHasChanges(true);
              }}
            >
              Test Changes (Debug)
            </button>
          </div>
          
          {loading ? (
            <div className="menu-manager-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p>Loading menu items...</p>
            </div>
          ) : (
            <div className="menu-manager-list">
              {menuTree.map((item, index) => renderMenuItem(item, index, menuTree))}
            </div>
          )}
        </div>
        
        <div className="menu-manager-footer">
          <div className="menu-manager-actions">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Saving...</span>
                  </div>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check me-2"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>
          
          {hasChanges && (
            <div className="unsaved-changes-indicator">
              <i className="bi bi-exclamation-triangle text-warning me-2"></i>
              You have unsaved changes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DragDropMenuManager;