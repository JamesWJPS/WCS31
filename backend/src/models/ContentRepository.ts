import { BaseRepository } from './BaseRepository';
import { Content, ContentTable } from './interfaces';

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

  async publish(id: string): Promise<Content | null> {
    const now = new Date();
    await this.db(this.tableName).where({ id }).update({
      status: 'published',
      published_at: now,
      updated_at: now,
    });
    return this.findById(id);
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