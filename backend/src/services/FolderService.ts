import { FolderRepository } from '../models/FolderRepository';
import { DocumentRepository } from '../models/DocumentRepository';
import { Folder } from '../models/interfaces';

export class FolderService {
  private folderRepository: FolderRepository;
  private documentRepository: DocumentRepository;

  constructor() {
    this.folderRepository = new FolderRepository();
    this.documentRepository = new DocumentRepository();
  }

  /**
   * Create a new folder with permission validation
   */
  async createFolder(
    folderData: {
      name: string;
      parentId: string | null;
      isPublic: boolean;
      permissions?: { read: string[]; write: string[] };
    },
    userId: string,
    userRole: string
  ): Promise<Folder> {
    // Check if user has write permission to parent folder (if not root)
    if (folderData.parentId) {
      const hasPermission = await this.folderRepository.hasWritePermission(
        folderData.parentId,
        userId,
        userRole
      );

      if (!hasPermission) {
        throw new Error('Insufficient permissions to create folder in this location');
      }
    }

    const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const defaultPermissions = folderData.permissions || { read: [], write: [] };

    const created = await this.folderRepository.create({
      id: folderId,
      name: folderData.name,
      parent_id: folderData.parentId,
      is_public: folderData.isPublic,
      permissions: JSON.stringify(defaultPermissions),
      created_by: userId,
    });

    return created;
  }

  /**
   * Get folders accessible to a user
   */
  async getFoldersForUser(userId: string, userRole: string): Promise<Folder[]> {
    return this.folderRepository.getFoldersForUser(userId, userRole);
  }

  /**
   * Get folder hierarchy tree for a user
   */
  async getFolderTree(userId: string, userRole: string): Promise<any[]> {
    const accessibleFolders = await this.getFoldersForUser(userId, userRole);
    const rootFolders = accessibleFolders.filter(folder => !folder.parentId);

    const buildTree = (parentFolders: Folder[]): any[] => {
      return parentFolders.map(folder => ({
        ...folder,
        children: buildTree(
          accessibleFolders.filter(f => f.parentId === folder.id)
        ),
      }));
    };

    return buildTree(rootFolders);
  }

  /**
   * Update folder with permission check
   */
  async updateFolder(
    folderId: string,
    updates: {
      name?: string;
      isPublic?: boolean;
      permissions?: { read: string[]; write: string[] };
    },
    userId: string,
    userRole: string
  ): Promise<Folder | null> {
    const hasPermission = await this.folderRepository.hasWritePermission(folderId, userId, userRole);
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to update this folder');
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
    if (updates.permissions !== undefined) {
      updateData.permissions = JSON.stringify(updates.permissions);
    }
    updateData.updated_at = new Date();

    return this.folderRepository.update(folderId, updateData);
  }

  /**
   * Delete folder with permission check and cascade handling
   */
  async deleteFolder(folderId: string, userId: string, userRole: string): Promise<boolean> {
    const hasPermission = await this.folderRepository.hasWritePermission(folderId, userId, userRole);
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to delete this folder');
    }

    // Check if folder has children
    const children = await this.folderRepository.findByParent(folderId);
    if (children.length > 0) {
      throw new Error('Cannot delete folder with subfolders. Delete subfolders first.');
    }

    // Check if folder has documents
    const documents = await this.documentRepository.findByFolder(folderId);
    if (documents.length > 0) {
      throw new Error('Cannot delete folder with documents. Move or delete documents first.');
    }

    return this.folderRepository.delete(folderId);
  }

  /**
   * Move folder with permission and hierarchy validation
   */
  async moveFolder(
    folderId: string,
    newParentId: string | null,
    userId: string,
    userRole: string
  ): Promise<Folder | null> {
    // Check write permission on source folder
    const hasSourcePermission = await this.folderRepository.hasWritePermission(
      folderId,
      userId,
      userRole
    );

    if (!hasSourcePermission) {
      throw new Error('Insufficient permissions to move this folder');
    }

    // Check write permission on destination parent (if not root)
    if (newParentId) {
      const hasDestPermission = await this.folderRepository.hasWritePermission(
        newParentId,
        userId,
        userRole
      );

      if (!hasDestPermission) {
        throw new Error('Insufficient permissions to move folder to this location');
      }
    }

    return this.folderRepository.moveFolder(folderId, newParentId);
  }

  /**
   * Update folder permissions with validation
   */
  async updateFolderPermissions(
    folderId: string,
    permissions: { read: string[]; write: string[] },
    userId: string,
    userRole: string
  ): Promise<Folder | null> {
    const hasPermission = await this.folderRepository.hasWritePermission(folderId, userId, userRole);
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to update folder permissions');
    }

    return this.folderRepository.updatePermissions(folderId, permissions);
  }

  /**
   * Get folder path from root to specified folder
   */
  async getFolderPath(folderId: string, userId: string, userRole: string): Promise<Folder[]> {
    const hasPermission = await this.folderRepository.hasReadPermission(folderId, userId, userRole);
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to access this folder');
    }

    return this.folderRepository.getFolderPath(folderId);
  }

  /**
   * Get folder contents (subfolders and documents) with permissions
   */
  async getFolderContents(folderId: string, userId: string, userRole: string) {
    const hasPermission = await this.folderRepository.hasReadPermission(folderId, userId, userRole);
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to access this folder');
    }

    const [subfolders, documents] = await Promise.all([
      this.folderRepository.findByParent(folderId),
      this.documentRepository.findByFolder(folderId),
    ]);

    // Filter subfolders based on user permissions
    const accessibleSubfolders: Folder[] = [];
    for (const subfolder of subfolders) {
      const hasSubfolderPermission = await this.folderRepository.hasReadPermission(
        subfolder.id,
        userId,
        userRole
      );
      if (hasSubfolderPermission) {
        accessibleSubfolders.push(subfolder);
      }
    }

    return {
      folders: accessibleSubfolders,
      documents,
    };
  }

  /**
   * Check if user can access folder
   */
  async canAccessFolder(folderId: string, userId: string, userRole: string): Promise<boolean> {
    return this.folderRepository.hasReadPermission(folderId, userId, userRole);
  }

  /**
   * Get public folders (for public website)
   */
  async getPublicFolders(): Promise<Folder[]> {
    return this.folderRepository.findPublicFolders();
  }

  /**
   * Get folder statistics including document count and total size
   */
  async getFolderStatistics(folderId: string, userId: string, userRole: string) {
    const hasPermission = await this.folderRepository.hasReadPermission(folderId, userId, userRole);
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to access folder statistics');
    }

    const [subfolders] = await Promise.all([
      this.folderRepository.findByParent(folderId),
    ]);

    const documentStats = await this.documentRepository.getFolderStats(folderId);

    return {
      ...documentStats,
      subfolderCount: subfolders.length,
    };
  }
}