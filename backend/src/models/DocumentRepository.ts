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