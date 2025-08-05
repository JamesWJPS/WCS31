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