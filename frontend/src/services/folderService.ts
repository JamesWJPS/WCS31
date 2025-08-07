import apiService from './api';
import { ApiResponse, Folder, FolderTreeNode, FolderContents } from '../types';

class FolderService {
  /**
   * Get all folders accessible to the current user
   */
  async getFolders(): Promise<Folder[]> {
    const response = await apiService.get<{ folders: Folder[]; count: number }>('/folders');
    return response.data.folders;
  }

  /**
   * Get folder hierarchy tree
   */
  async getFolderTree(): Promise<FolderTreeNode[]> {
    const response = await apiService.get<{ tree: FolderTreeNode[]; count: number }>('/folders/tree');
    return response.data.tree;
  }

  /**
   * Get public folders (for public website)
   */
  async getPublicFolders(): Promise<Folder[]> {
    const response = await apiService.get<{ folders: Folder[]; count: number }>('/folders/public');
    return response.data.folders;
  }

  /**
   * Get folder by ID
   */
  async getFolder(id: string): Promise<Folder> {
    const response = await apiService.get<{ folder: Folder }>(`/folders/${id}`);
    return response.data.folder;
  }

  /**
   * Get folder contents (subfolders and documents)
   */
  async getFolderContents(id: string): Promise<FolderContents> {
    const response = await apiService.get<FolderContents & { folderCount: number; documentCount: number }>(`/folders/${id}/contents`);
    return {
      folder: response.data.folder,
      folders: response.data.folders,
      documents: response.data.documents
    };
  }

  /**
   * Get folder path from root
   */
  async getFolderPath(id: string): Promise<Folder[]> {
    const response = await apiService.get<{ path: Folder[]; depth: number }>(`/folders/${id}/path`);
    return response.data.path;
  }

  /**
   * Get folder statistics
   */
  async getFolderStatistics(id: string): Promise<{ documentCount: number; totalSize: number; subfolderCount: number }> {
    const response = await apiService.get<{ documentCount: number; totalSize: number; subfolderCount: number }>(`/folders/${id}/stats`);
    return response.data;
  }

  /**
   * Create a new folder
   */
  async createFolder(folderData: {
    name: string;
    parentId?: string | null;
    isPublic?: boolean;
    permissions?: { read: string[]; write: string[] };
  }): Promise<Folder> {
    const response = await apiService.post<{ folder: Folder; message: string }>('/folders', folderData);
    return response.data.folder;
  }

  /**
   * Update folder details
   */
  async updateFolder(id: string, folderData: {
    name?: string;
    isPublic?: boolean;
    permissions?: { read: string[]; write: string[] };
  }): Promise<Folder> {
    const response = await apiService.put<{ folder: Folder; message: string }>(`/folders/${id}`, folderData);
    return response.data.folder;
  }

  /**
   * Update folder permissions
   */
  async updateFolderPermissions(id: string, permissions: { read: string[]; write: string[] }): Promise<Folder> {
    const response = await apiService.put<{ folder: Folder; message: string }>(`/folders/${id}/permissions`, { permissions });
    return response.data.folder;
  }

  /**
   * Move folder to different parent
   */
  async moveFolder(id: string, parentId: string | null): Promise<Folder> {
    const response = await apiService.put<{ folder: Folder; message: string }>(`/folders/${id}/move`, { parentId });
    return response.data.folder;
  }

  /**
   * Delete a folder
   */
  async deleteFolder(id: string): Promise<void> {
    await apiService.delete(`/folders/${id}`);
  }

  /**
   * Check if user can access folder
   */
  async checkFolderAccess(id: string): Promise<{ canAccess: boolean; message: string }> {
    const response = await apiService.get<{ folderId: string; canAccess: boolean; message: string }>(`/folders/${id}/access`);
    return {
      canAccess: response.data.canAccess,
      message: response.data.message
    };
  }
}

export default new FolderService();