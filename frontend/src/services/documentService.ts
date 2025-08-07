import apiService from './api';
import { ApiResponse, Document, Folder, FolderTreeNode, FolderContents, DocumentFilter } from '../types';

class DocumentService {
  /**
   * Get all documents accessible to the current user
   */
  async getDocuments(): Promise<Document[]> {
    const response = await apiService.get<{ documents: Document[]; count: number }>('/documents');
    return response.data.documents;
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document> {
    const response = await apiService.get<{ document: Document }>(`/documents/${id}`);
    return response.data.document;
  }

  /**
   * Upload a single document
   */
  async uploadDocument(file: File, folderId: string, metadata?: { title?: string; description?: string; tags?: string[] }): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);
    
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.description) formData.append('description', metadata.description);
    if (metadata?.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const response = await apiService.post<{ document: Document; message: string }>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.document;
  }

  /**
   * Upload multiple documents
   */
  async uploadBulkDocuments(files: File[], folderId: string, metadata?: { title?: string; description?: string; tags?: string[] }): Promise<Document[]> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('folderId', folderId);
    
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.description) formData.append('description', metadata.description);
    if (metadata?.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const response = await apiService.post<{ documents: Document[]; count: number; message: string }>('/documents/upload/bulk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.documents;
  }

  /**
   * Download a document
   */
  async downloadDocument(id: string): Promise<Blob> {
    const response = await apiService.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(id: string, metadata: { title?: string; description?: string; tags?: string[] }): Promise<Document> {
    const response = await apiService.put<{ document: Document; message: string }>(`/documents/${id}`, metadata);
    return response.data.document;
  }

  /**
   * Move document to different folder
   */
  async moveDocument(id: string, folderId: string): Promise<Document> {
    const response = await apiService.put<{ document: Document; message: string }>(`/documents/${id}/move`, { folderId });
    return response.data.document;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    await apiService.delete(`/documents/${id}`);
  }

  /**
   * Delete multiple documents
   */
  async deleteBulkDocuments(documentIds: string[]): Promise<{ deleted: number; errorCount: number; errors?: any[] }> {
    const response = await apiService.delete<{ deleted: number; errorCount: number; errors?: any[]; message: string }>('/documents/bulk', {
      data: { documentIds }
    });
    return response.data;
  }

  /**
   * Search documents
   */
  async searchDocuments(searchTerm: string, searchType: 'name' | 'metadata' | 'tags' = 'name'): Promise<Document[]> {
    const response = await apiService.get<{ documents: Document[]; count: number; searchTerm: string; searchType: string }>('/documents/search', {
      params: { q: searchTerm, type: searchType }
    });
    return response.data.documents;
  }

  /**
   * Get documents in a specific folder
   */
  async getDocumentsInFolder(folderId: string): Promise<Document[]> {
    const response = await apiService.get<{ documents: Document[]; count: number; folderId: string }>(`/folders/${folderId}/documents`);
    return response.data.documents;
  }

  /**
   * Move multiple documents to a folder
   */
  async bulkMoveDocuments(documentIds: string[], folderId: string): Promise<{ moved: number; errorCount: number; errors?: any[] }> {
    const response = await apiService.put<{ moved: number; errorCount: number; errors?: any[]; message: string }>('/documents/bulk/move', {
      documentIds,
      folderId
    });
    return response.data;
  }

  /**
   * Update metadata for multiple documents
   */
  async bulkUpdateMetadata(documentIds: string[], metadata: { title?: string; description?: string; tags?: string[] }): Promise<{ updated: number; errorCount: number; errors?: any[] }> {
    const response = await apiService.put<{ updated: number; errorCount: number; errors?: any[]; message: string }>('/documents/bulk/metadata', {
      documentIds,
      metadata
    });
    return response.data;
  }
}

export default new DocumentService();