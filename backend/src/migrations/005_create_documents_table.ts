import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('documents', (table) => {
    table.string('id').primary();
    table.string('filename').notNullable();
    table.string('original_name').notNullable();
    table.string('mime_type').notNullable();
    table.integer('size').notNullable();
    table.string('folder_id').notNullable();
    table.string('uploaded_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.text('metadata').notNullable().defaultTo('{}'); // JSON string
    
    table.foreign('folder_id').references('id').inTable('folders');
    table.foreign('uploaded_by').references('id').inTable('users');
    
    table.index(['folder_id']);
    table.index(['uploaded_by']);
    table.index(['mime_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('documents');
}