import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('document_listings', (table) => {
    table.string('id').primary();
    table.string('content_id').notNullable();
    table.string('folder_id').notNullable();
    table.string('template_id').notNullable();
    table.string('title').notNullable();
    table.text('configuration').notNullable().defaultTo('{}'); // JSON string
    table.string('sort_by', 50).defaultTo('name');
    table.string('sort_order', 10).defaultTo('asc');
    table.boolean('show_metadata').defaultTo(true);
    table.integer('items_per_page').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('content_id').references('id').inTable('content');
    table.foreign('folder_id').references('id').inTable('folders');
    table.foreign('template_id').references('id').inTable('document_templates');
    
    // Add indexes for performance
    table.index(['content_id']);
    table.index(['folder_id']);
    table.index(['template_id']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('document_listings');
}