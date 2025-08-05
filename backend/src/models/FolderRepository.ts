import { BaseRepository } from './BaseRepository';
import { Folder, FolderTable } from './interfaces';

export class FolderRepository extends BaseRepository<Folder, FolderTable> {
  constructor() {
    super('folders');
  }

  async findByParent(parentId: string | null): Promise<Folder[]> {
    const query = parentId 
      ? this.db(this.tableName).where({ parent_id: parentId })
      : this.db(this.tableName).whereNull('parent_id');
    
    const results = await query;
    return results.map(result => this.mapFromTable(result));
  }

  async findPublicFolders(): Promise<Folder[]> {
    const results = await this.db(this.tableName).where({ is_public: true });
    return results.map(result => this.mapFromTable(result));
  }

  async findByCreator(createdBy: string): Promise<Folder[]> {
    const results = await this.db(this.tableName).where({ created_by: createdBy });
    return results.map(result => this.mapFromTable(result));
  }

  async updatePermissions(id: string, permissions: { read: string[]; write: string[] }): Promise<Folder | null> {
    await this.db(this.tableName).where({ id }).update({
      permissions: JSON.stringify(permissions),
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  /**
   * Get the complete folder hierarchy path from root to the specified folder
   */
  async getFolderPath(folderId: string): Promise<Folder[]> {
    const path: Folder[] = [];
    let currentFolder = await this.findById(folderId);
    
    while (currentFolder) {
      path.unshift(currentFolder);
      if (currentFolder.parentId) {
        currentFolder = await this.findById(currentFolder.parentId);
      } else {
        break;
      }
    }
    
    return path;
  }

  /**
   * Get all descendant folders (children, grandchildren, etc.) of a folder
   */
  async getDescendantFolders(folderId: string): Promise<Folder[]> {
    const descendants: Folder[] = [];
    const directChildren = await this.findByParent(folderId);
    
    for (const child of directChildren) {
      descendants.push(child);
      const childDescendants = await this.getDescendantFolders(child.id);
      descendants.push(...childDescendants);
    }
    
    return descendants;
  }

  /**
   * Check if a folder can be moved to a new parent (prevents circular references)
   */
  async canMoveFolder(folderId: string, newParentId: string | null): Promise<boolean> {
    if (!newParentId) {
      return true; // Moving to root is always allowed
    }
    
    if (folderId === newParentId) {
      return false; // Cannot move folder to itself
    }
    
    // Check if newParentId is a descendant of folderId
    const descendants = await this.getDescendantFolders(folderId);
    return !descendants.some(folder => folder.id === newParentId);
  }

  /**
   * Move a folder to a new parent
   */
  async moveFolder(folderId: string, newParentId: string | null): Promise<Folder | null> {
    const canMove = await this.canMoveFolder(folderId, newParentId);
    if (!canMove) {
      throw new Error('Cannot move folder: would create circular reference');
    }
    
    await this.db(this.tableName).where({ id: folderId }).update({
      parent_id: newParentId,
      updated_at: new Date(),
    });
    
    return this.findById(folderId);
  }

  /**
   * Check if a user has read permission for a folder
   */
  async hasReadPermission(folderId: string, userId: string, userRole: string): Promise<boolean> {
    const folder = await this.findById(folderId);
    if (!folder) {
      return false;
    }
    
    // Administrators have access to everything
    if (userRole === 'administrator') {
      return true;
    }
    
    // Public folders are readable by everyone
    if (folder.isPublic) {
      return true;
    }
    
    // Check explicit read permissions
    return folder.permissions.read.includes(userId);
  }

  /**
   * Check if a user has write permission for a folder
   */
  async hasWritePermission(folderId: string, userId: string, userRole: string): Promise<boolean> {
    const folder = await this.findById(folderId);
    if (!folder) {
      return false;
    }
    
    // Administrators have access to everything
    if (userRole === 'administrator') {
      return true;
    }
    
    // Check if user is the creator
    if (folder.createdBy === userId) {
      return true;
    }
    
    // Check explicit write permissions
    return folder.permissions.write.includes(userId);
  }

  /**
   * Get folders accessible to a user based on their permissions
   */
  async getFoldersForUser(userId: string, userRole: string): Promise<Folder[]> {
    if (userRole === 'administrator') {
      return this.findAll();
    }
    
    const allFolders = await this.findAll();
    const accessibleFolders: Folder[] = [];
    
    for (const folder of allFolders) {
      if (folder.isPublic || 
          folder.createdBy === userId || 
          folder.permissions.read.includes(userId) || 
          folder.permissions.write.includes(userId)) {
        accessibleFolders.push(folder);
      }
    }
    
    return accessibleFolders;
  }

  protected mapFromTable(tableRow: FolderTable): Folder {
    return {
      id: tableRow.id,
      name: tableRow.name,
      parentId: tableRow.parent_id,
      isPublic: Boolean(tableRow.is_public),
      permissions: JSON.parse(tableRow.permissions),
      createdBy: tableRow.created_by,
      createdAt: new Date(tableRow.created_at),
      updatedAt: new Date(tableRow.updated_at),
    };
  }

  protected mapToTable(entity: Folder): FolderTable {
    return {
      id: entity.id,
      name: entity.name,
      parent_id: entity.parentId,
      is_public: entity.isPublic,
      permissions: JSON.stringify(entity.permissions),
      created_by: entity.createdBy,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}