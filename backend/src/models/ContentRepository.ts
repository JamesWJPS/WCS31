import { BaseRepository } from './BaseRepository';
import { Content, ContentTable } from './interfaces';

export interface ContentSearchOptions {
  query?: string;
  status?: 'draft' | 'published' | 'archived';
  authorId?: string;
  templateId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'publishedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ContentVersion {
  id: string;
  contentId: string;
  version: number;
  title: string;
  body: string;
  metadata: Record<string, any>;
  createdAt: Date;
  createdBy: string;
}

export class ContentRepository extends BaseRepository<Content, ContentTable> {
  constructor() {
    super('content');
  }

  async findBySlug(slug: string): Promise<Content | null> {
    const result = await this.db(this.tableName).where({ slug }).first();
    return result ? this.mapFromTable(result) : null;
  }

  async findByAuthor(authorId: string): Promise<Content[]> {
    const results = await this.db(this.tableName).where({ author_id: authorId });
    return results.map(result => this.mapFromTable(result));
  }

  async findByStatus(status: 'draft' | 'published' | 'archived'): Promise<Content[]> {
    const results = await this.db(this.tableName).where({ status });
    return results.map(result => this.mapFromTable(result));
  }

  async findByTemplate(templateId: string): Promise<Content[]> {
    const results = await this.db(this.tableName).where({ template_id: templateId });
    return results.map(result => this.mapFromTable(result));
  }

  async search(options: ContentSearchOptions): Promise<{ content: Content[]; total: number }> {
    let query = this.db(this.tableName);

    // Text search in title and body
    if (options.query) {
      query = query.where(function() {
        this.where('title', 'like', `%${options.query}%`)
            .orWhere('body', 'like', `%${options.query}%`);
      });
    }

    // Filter by status
    if (options.status) {
      query = query.where('status', options.status);
    }

    // Filter by author
    if (options.authorId) {
      query = query.where('author_id', options.authorId);
    }

    // Filter by template
    if (options.templateId) {
      query = query.where('template_id', options.templateId);
    }

    // Filter by tags (search in metadata JSON)
    if (options.tags && options.tags.length > 0) {
      query = query.where(function() {
        options.tags!.forEach(tag => {
          this.orWhere('metadata', 'like', `%"${tag}"%`);
        });
      });
    }

    // Date range filtering
    if (options.dateFrom) {
      query = query.where('created_at', '>=', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.where('created_at', '<=', options.dateTo);
    }

    // Get total count for pagination
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count').first();
    const total = totalResult ? Number(totalResult['count']) : 0;

    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    const sortColumn = this.getSortColumn(sortBy);
    query = query.orderBy(sortColumn, sortOrder);

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    const results = await query;
    const content = results.map(result => this.mapFromTable(result));

    return { content, total };
  }

  async publish(id: string): Promise<Content | null> {
    const now = new Date();
    await this.db(this.tableName).where({ id }).update({
      status: 'published',
      published_at: now,
      updated_at: now,
    });
    return this.findById(id);
  }

  async archive(id: string): Promise<Content | null> {
    const now = new Date();
    await this.db(this.tableName).where({ id }).update({
      status: 'archived',
      updated_at: now,
    });
    return this.findById(id);
  }

  async unpublish(id: string): Promise<Content | null> {
    const now = new Date();
    await this.db(this.tableName).where({ id }).update({
      status: 'draft',
      published_at: null,
      updated_at: now,
    });
    return this.findById(id);
  }

  async createVersion(contentId: string, createdBy: string): Promise<ContentVersion | null> {
    const content = await this.findById(contentId);
    if (!content) {
      return null;
    }

    // Get the next version number
    const lastVersion = await this.db('content_versions')
      .where({ content_id: contentId })
      .orderBy('version', 'desc')
      .first();
    
    const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

    const versionData = {
      id: `${contentId}-v${nextVersion}`,
      content_id: contentId,
      version: nextVersion,
      title: content.title,
      body: content.body,
      metadata: JSON.stringify(content.metadata),
      created_at: new Date(),
      created_by: createdBy,
    };

    await this.db('content_versions').insert(versionData);

    return {
      id: versionData.id,
      contentId: versionData.content_id,
      version: versionData.version,
      title: versionData.title,
      body: versionData.body,
      metadata: JSON.parse(versionData.metadata),
      createdAt: versionData.created_at,
      createdBy: versionData.created_by,
    };
  }

  async getVersions(contentId: string): Promise<ContentVersion[]> {
    const results = await this.db('content_versions')
      .where({ content_id: contentId })
      .orderBy('version', 'desc');

    return results.map(result => ({
      id: result.id,
      contentId: result.content_id,
      version: result.version,
      title: result.title,
      body: result.body,
      metadata: JSON.parse(result.metadata),
      createdAt: new Date(result.created_at),
      createdBy: result.created_by,
    }));
  }

  async restoreVersion(contentId: string, version: number, updatedBy: string): Promise<Content | null> {
    const versionData = await this.db('content_versions')
      .where({ content_id: contentId, version })
      .first();

    if (!versionData) {
      return null;
    }

    // Create a new version before restoring
    await this.createVersion(contentId, updatedBy);

    // Update the content with the version data
    const now = new Date();
    await this.db(this.tableName).where({ id: contentId }).update({
      title: versionData.title,
      body: versionData.body,
      metadata: versionData.metadata,
      updated_at: now,
    });

    return this.findById(contentId);
  }

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      title: 'title',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      publishedAt: 'published_at',
    };
    return columnMap[sortBy] || 'created_at';
  }

  protected mapFromTable(tableRow: ContentTable): Content {
    return {
      id: tableRow.id,
      title: tableRow.title,
      slug: tableRow.slug,
      body: tableRow.body,
      templateId: tableRow.template_id,
      authorId: tableRow.author_id,
      status: tableRow.status,
      metadata: JSON.parse(tableRow.metadata),
      createdAt: new Date(tableRow.created_at),
      updatedAt: new Date(tableRow.updated_at),
      publishedAt: tableRow.published_at ? new Date(tableRow.published_at) : null,
    };
  }

  async bulkUpdateMenuOrder(updates: Array<{id: string; menu_order: number; parent_id?: string | null; show_in_menu?: boolean | number}>): Promise<void> {
    const trx = await this.db.transaction();
    
    try {
      for (const update of updates) {
        const updateData: any = {
          menu_order: update.menu_order,
          updated_at: new Date(),
        };

        if (update.parent_id !== undefined) {
          updateData.parent_id = update.parent_id;
        }

        if (update.show_in_menu !== undefined) {
          updateData.show_in_menu = update.show_in_menu;
        }

        await trx(this.tableName)
          .where({ id: update.id })
          .update(updateData);
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  protected mapToTable(entity: Content): ContentTable {
    return {
      id: entity.id,
      title: entity.title,
      slug: entity.slug,
      body: entity.body,
      template_id: entity.templateId,
      author_id: entity.authorId,
      status: entity.status,
      metadata: JSON.stringify(entity.metadata),
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      published_at: entity.publishedAt,
    };
  }
}