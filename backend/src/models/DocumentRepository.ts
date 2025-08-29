import { BaseRepository } from './BaseRepository';
import { Document, DocumentTable } from './interfaces';

export class DocumentRepository extends BaseRepository<Document, DocumentTable> {
  constructor() {
    super('documents');
  }

  async findByFolder(folderId: string): Promise<Document[]> {
    const results = await this.db(this.tableName).where({ folder_id: folderId });
    return results.map(result => this.mapFromTable(result));
  }

  async findByUploader(uploadedBy: string): Promise<Document[]> {
    const results = await this.db(this.tableName).where({ uploaded_by: uploadedBy });
    return results.map(result => this.mapFromTable(result));
  }

  async findByMimeType(mimeType: string): Promise<Document[]> {
    const results = await this.db(this.tableName).where({ mime_type: mimeType });
    return results.map(result => this.mapFromTable(result));
  }

  async searchByName(searchTerm: string): Promise<Document[]> {
    const results = await this.db(this.tableName)
      .where('original_name', 'like', `%${searchTerm}%`)
      .orWhere('filename', 'like', `%${searchTerm}%`);
    return results.map(result => this.mapFromTable(result));
  }

  /**
   * Search documents by metadata fields
   */
  async searchByMetadata(searchTerm: string): Promise<Document[]> {
    const results = await this.db(this.tableName)
      .where('metadata', 'like', `%${searchTerm}%`);
    return results.map(result => this.mapFromTable(result));
  }

  /**
   * Find documents by tags in metadata
   */
  async findByTags(tags: string[]): Promise<Document[]> {
    const results = await this.db(this.tableName);
    const filteredResults = results.filter(result => {
      const metadata = JSON.parse(result.metadata);
      const documentTags = metadata.tags || [];
      return tags.some(tag => documentTags.includes(tag));
    });
    return filteredResults.map(result => this.mapFromTable(result));
  }

  /**
   * Update document metadata
   */
  async updateMetadata(id: string, metadata: { title?: string; description?: string; tags?: string[] }): Promise<Document | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updatedMetadata = { ...existing.metadata, ...metadata };
    
    await this.db(this.tableName).where({ id }).update({
      metadata: JSON.stringify(updatedMetadata),
      updated_at: new Date(),
    });
    
    return this.findById(id);
  }

  /**
   * Get documents in folders accessible to a user
   */
  async getDocumentsForUser(userId: string, userRole: string, folderRepository: any): Promise<Document[]> {
    const accessibleFolders = await folderRepository.getFoldersForUser(userId, userRole);
    const folderIds = accessibleFolders.map((folder: any) => folder.id);
    
    if (folderIds.length === 0) {
      return [];
    }
    
    const results = await this.db(this.tableName).whereIn('folder_id', folderIds);
    return results.map(result => this.mapFromTable(result));
  }

  /**
   * Get documents in folders accessible to a user with filtering, sorting, and pagination
   */
  async getDocumentsForUserWithFilters(
    userId: string, 
    userRole: string, 
    folderRepository: any,
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
    // Get accessible folders
    const accessibleFolders = await folderRepository.getFoldersForUser(userId, userRole);
    let folderIds = accessibleFolders.map((folder: any) => folder.id);
    
    if (folderIds.length === 0) {
      return { documents: [], totalCount: 0 };
    }

    // Apply folder filter if specified
    if (filters.folderId) {
      if (folderIds.includes(filters.folderId)) {
        folderIds = [filters.folderId];
      } else {
        return { documents: [], totalCount: 0 };
      }
    }

    // Build query
    let query = this.db(this.tableName).whereIn('folder_id', folderIds);

    // Apply filters
    if (filters.mimeType) {
      query = query.where('mime_type', filters.mimeType);
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    if (filters.minSize) {
      query = query.where('size', '>=', filters.minSize);
    }

    if (filters.maxSize) {
      query = query.where('size', '<=', filters.maxSize);
    }

    // Get total count before pagination
    const totalCountResult = await query.clone().count('* as count');
    const totalCount = totalCountResult[0]?.['count'] as number || 0;

    // Apply sorting
    const sortColumn = this.getSortColumn(sorting.sortBy);
    query = query.orderBy(sortColumn, sorting.sortOrder);

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit;
    query = query.limit(pagination.limit).offset(offset);

    const results = await query;
    const documents = results.map(result => this.mapFromTable(result));

    return { documents, totalCount };
  }

  /**
   * Advanced search with filtering, sorting, and pagination
   */
  async searchDocumentsAdvanced(
    searchTerm: string,
    userId: string,
    userRole: string,
    folderRepository: any,
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
    // Get accessible folders
    const accessibleFolders = await folderRepository.getFoldersForUser(userId, userRole);
    let folderIds = accessibleFolders.map((folder: any) => folder.id);
    
    if (folderIds.length === 0) {
      return { documents: [], totalCount: 0 };
    }

    // Apply folder filter if specified
    if (filters.folderId) {
      if (folderIds.includes(filters.folderId)) {
        folderIds = [filters.folderId];
      } else {
        return { documents: [], totalCount: 0 };
      }
    }

    // Build base query
    let query = this.db(this.tableName).whereIn('folder_id', folderIds);

    // Apply search filters based on search type
    if (searchType === 'all') {
      query = query.where(function() {
        this.where('original_name', 'like', `%${searchTerm}%`)
          .orWhere('filename', 'like', `%${searchTerm}%`)
          .orWhere('metadata', 'like', `%${searchTerm}%`);
      });
    } else if (searchType === 'name') {
      query = query.where(function() {
        this.where('original_name', 'like', `%${searchTerm}%`)
          .orWhere('filename', 'like', `%${searchTerm}%`);
      });
    } else if (searchType === 'metadata') {
      query = query.where('metadata', 'like', `%${searchTerm}%`);
    } else if (searchType === 'tags') {
      query = query.where('metadata', 'like', `%"tags"%${searchTerm}%`);
    }

    // Apply additional filters
    if (filters.mimeType) {
      query = query.where('mime_type', filters.mimeType);
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    // Get total count before pagination
    const totalCountResult = await query.clone().count('* as count');
    const totalCount = totalCountResult[0]?.['count'] as number || 0;

    // Apply sorting
    const sortColumn = this.getSortColumn(sorting.sortBy);
    query = query.orderBy(sortColumn, sorting.sortOrder);

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit;
    query = query.limit(pagination.limit).offset(offset);

    const results = await query;
    const documents = results.map(result => this.mapFromTable(result));

    return { documents, totalCount };
  }

  /**
   * Map sort field to database column
   */
  private getSortColumn(sortBy: string): string {
    switch (sortBy) {
      case 'name':
        return 'original_name';
      case 'size':
        return 'size';
      case 'createdAt':
        return 'created_at';
      case 'mimeType':
        return 'mime_type';
      default:
        return 'created_at';
    }
  }

  /**
   * Get document statistics for a folder
   */
  async getFolderStats(folderId: string): Promise<{
    totalDocuments: number;
    totalSize: number;
    mimeTypes: Record<string, number>;
  }> {
    const documents = await this.findByFolder(folderId);
    
    const stats = {
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
      mimeTypes: {} as Record<string, number>,
    };
    
    documents.forEach(doc => {
      stats.mimeTypes[doc.mimeType] = (stats.mimeTypes[doc.mimeType] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Find documents with size greater than specified bytes
   */
  async findLargeDocuments(minSize: number): Promise<Document[]> {
    const results = await this.db(this.tableName).where('size', '>', minSize);
    return results.map(result => this.mapFromTable(result));
  }

  /**
   * Find documents created within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Document[]> {
    const results = await this.db(this.tableName)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate);
    return results.map(result => this.mapFromTable(result));
  }

  protected mapFromTable(tableRow: DocumentTable): Document {
    return {
      id: tableRow.id,
      filename: tableRow.filename,
      originalName: tableRow.original_name,
      mimeType: tableRow.mime_type,
      size: tableRow.size,
      folderId: tableRow.folder_id,
      uploadedBy: tableRow.uploaded_by,
      createdAt: new Date(tableRow.created_at),
      metadata: JSON.parse(tableRow.metadata),
    };
  }

  protected mapToTable(entity: Document): DocumentTable {
    return {
      id: entity.id,
      filename: entity.filename,
      original_name: entity.originalName,
      mime_type: entity.mimeType,
      size: entity.size,
      folder_id: entity.folderId,
      uploaded_by: entity.uploadedBy,
      created_at: entity.createdAt,
      updated_at: new Date(),
      metadata: JSON.stringify(entity.metadata),
    };
  }
}