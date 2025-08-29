import { DocumentRepository } from '../models/DocumentRepository';
import { FolderRepository } from '../models/FolderRepository';
import { Document } from '../models/interfaces';

export class DocumentService {
  private documentRepository: DocumentRepository;
  private folderRepository: FolderRepository;

  constructor() {
    this.documentRepository = new DocumentRepository();
    this.folderRepository = new FolderRepository();
  }

  /**
   * Create a new document with permission validation
   */
  async createDocument(
    documentData: Omit<Document, 'id' | 'createdAt'>,
    userId: string,
    userRole: string
  ): Promise<Document> {
    // Check if user has write permission to the folder
    const hasPermission = await this.folderRepository.hasWritePermission(
      documentData.folderId,
      userId,
      userRole
    );

    if (!hasPermission) {
      throw new Error('Insufficient permissions to upload to this folder');
    }

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const created = await this.documentRepository.create({
      id: documentId,
      filename: documentData.filename,
      original_name: documentData.originalName,
      mime_type: documentData.mimeType,
      size: documentData.size,
      folder_id: documentData.folderId,
      uploaded_by: documentData.uploadedBy,
      metadata: JSON.stringify(documentData.metadata),
    });

    return created;
  }

  /**
   * Get documents accessible to a user
   */
  async getDocumentsForUser(userId: string, userRole: string): Promise<Document[]> {
    return this.documentRepository.getDocumentsForUser(userId, userRole, this.folderRepository);
  }

  /**
   * Get documents accessible to a user with filtering, sorting, and pagination
   */
  async getDocumentsForUserWithFilters(
    userId: string, 
    userRole: string,
    filters: {
      folderId?: string;
      mimeType?: string;
      startDate?: Date;
      endDate?: Date;
      minSize?: number;
      maxSize?: number;
    },
    sorting: {
      sortBy: 'name' | 'size' | 'createdAt' | 'mimeType';
      sortOrder: 'asc' | 'desc';
    },
    pagination: {
      page: number;
      limit: number;
    }
  ): Promise<{ documents: Document[]; totalCount: number }> {
    return this.documentRepository.getDocumentsForUserWithFilters(
      userId, 
      userRole, 
      this.folderRepository,
      filters,
      sorting,
      pagination
    );
  }

  /**
   * Get documents in a specific folder with permission check
   */
  async getDocumentsInFolder(folderId: string, userId: string, userRole: string): Promise<Document[]> {
    const hasPermission = await this.folderRepository.hasReadPermission(folderId, userId, userRole);
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to access this folder');
    }

    return this.documentRepository.findByFolder(folderId);
  }

  /**
   * Update document metadata with permission check
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: { title?: string; description?: string; tags?: string[] },
    userId: string,
    userRole: string
  ): Promise<Document | null> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const hasPermission = await this.folderRepository.hasWritePermission(
      document.folderId,
      userId,
      userRole
    );

    if (!hasPermission && document.uploadedBy !== userId && userRole !== 'administrator') {
      throw new Error('Insufficient permissions to update this document');
    }

    return this.documentRepository.updateMetadata(documentId, metadata);
  }

  /**
   * Delete document with permission check
   */
  async deleteDocument(documentId: string, userId: string, userRole: string): Promise<boolean> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const hasPermission = await this.folderRepository.hasWritePermission(
      document.folderId,
      userId,
      userRole
    );

    if (!hasPermission && document.uploadedBy !== userId && userRole !== 'administrator') {
      throw new Error('Insufficient permissions to delete this document');
    }

    return this.documentRepository.delete(documentId);
  }

  /**
   * Search documents with permission filtering
   */
  async searchDocuments(
    searchTerm: string,
    userId: string,
    userRole: string,
    searchType: 'name' | 'metadata' | 'tags' = 'name'
  ): Promise<Document[]> {
    let allResults: Document[];

    switch (searchType) {
      case 'metadata':
        allResults = await this.documentRepository.searchByMetadata(searchTerm);
        break;
      case 'tags':
        allResults = await this.documentRepository.findByTags([searchTerm]);
        break;
      default:
        allResults = await this.documentRepository.searchByName(searchTerm);
    }

    // Filter results based on folder permissions
    const filteredResults: Document[] = [];
    for (const document of allResults) {
      const hasPermission = await this.folderRepository.hasReadPermission(
        document.folderId,
        userId,
        userRole
      );
      if (hasPermission) {
        filteredResults.push(document);
      }
    }

    return filteredResults;
  }

  /**
   * Advanced search with filtering, sorting, and pagination
   */
  async searchDocumentsAdvanced(
    searchTerm: string,
    userId: string,
    userRole: string,
    searchType: 'name' | 'metadata' | 'tags' | 'all',
    filters: {
      folderId?: string;
      mimeType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    sorting: {
      sortBy: 'name' | 'size' | 'createdAt' | 'mimeType';
      sortOrder: 'asc' | 'desc';
    },
    pagination: {
      page: number;
      limit: number;
    }
  ): Promise<{ documents: Document[]; totalCount: number }> {
    return this.documentRepository.searchDocumentsAdvanced(
      searchTerm,
      userId,
      userRole,
      this.folderRepository,
      searchType,
      filters,
      sorting,
      pagination
    );
  }

  /**
   * Get folder statistics with permission check
   */
  async getFolderStatistics(folderId: string, userId: string, userRole: string) {
    const hasPermission = await this.folderRepository.hasReadPermission(folderId, userId, userRole);
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to access folder statistics');
    }

    return this.documentRepository.getFolderStats(folderId);
  }

  /**
   * Move document to different folder with permission checks
   */
  async moveDocument(
    documentId: string,
    newFolderId: string,
    userId: string,
    userRole: string
  ): Promise<Document | null> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Check write permission on source folder
    const hasSourcePermission = await this.folderRepository.hasWritePermission(
      document.folderId,
      userId,
      userRole
    );

    // Check write permission on destination folder
    const hasDestPermission = await this.folderRepository.hasWritePermission(
      newFolderId,
      userId,
      userRole
    );

    if (!hasSourcePermission || !hasDestPermission) {
      throw new Error('Insufficient permissions to move document');
    }

    return this.documentRepository.update(documentId, {
      folder_id: newFolderId,
      updated_at: new Date(),
    });
  }
}