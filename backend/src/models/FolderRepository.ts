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