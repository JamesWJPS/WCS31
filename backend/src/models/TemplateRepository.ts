import { BaseRepository } from './BaseRepository';
import { Template, TemplateTable } from './interfaces';

export class TemplateRepository extends BaseRepository<Template, TemplateTable> {
  constructor() {
    super('templates');
  }

  async findActive(): Promise<Template[]> {
    const results = await this.db(this.tableName).where({ is_active: true });
    return results.map(result => this.mapFromTable(result));
  }

  async findByName(name: string): Promise<Template | null> {
    const result = await this.db(this.tableName).where({ name }).first();
    return result ? this.mapFromTable(result) : null;
  }

  async activate(id: string): Promise<Template | null> {
    await this.db(this.tableName).where({ id }).update({
      is_active: true,
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  async deactivate(id: string): Promise<Template | null> {
    await this.db(this.tableName).where({ id }).update({
      is_active: false,
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  // Custom create method that accepts Template domain model
  async createTemplate(template: Template): Promise<Template> {
    const tableData = this.mapToTable(template);
    const { created_at, updated_at, ...insertData } = tableData;
    
    const now = new Date();
    const finalInsertData = {
      ...insertData,
      created_at: now,
      updated_at: now,
    };

    await this.db(this.tableName).insert(finalInsertData);
    const created = await this.findById(template.id);
    if (!created) {
      throw new Error('Failed to create template');
    }
    return created;
  }

  // Custom update method that accepts Template domain model
  async updateTemplate(id: string, template: Template): Promise<Template | null> {
    const tableData = this.mapToTable(template);
    const { created_at, ...updateData } = tableData;
    
    const finalUpdateData = {
      ...updateData,
      updated_at: new Date(),
    };

    await this.db(this.tableName).where({ id }).update(finalUpdateData);
    return this.findById(id);
  }

  protected mapFromTable(tableRow: TemplateTable): Template {
    return {
      id: tableRow.id,
      name: tableRow.name,
      description: tableRow.description,
      htmlStructure: tableRow.html_structure,
      cssStyles: tableRow.css_styles,
      accessibilityFeatures: JSON.parse(tableRow.accessibility_features),
      contentFields: JSON.parse(tableRow.content_fields),
      isActive: Boolean(tableRow.is_active),
      createdAt: new Date(tableRow.created_at),
      updatedAt: new Date(tableRow.updated_at),
    };
  }

  protected mapToTable(entity: Template): TemplateTable {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      html_structure: entity.htmlStructure,
      css_styles: entity.cssStyles,
      accessibility_features: JSON.stringify(entity.accessibilityFeatures),
      content_fields: JSON.stringify(entity.contentFields),
      is_active: entity.isActive,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}