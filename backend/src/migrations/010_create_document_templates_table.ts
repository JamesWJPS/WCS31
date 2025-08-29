import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('document_templates', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description').nullable();
    table.text('html_template').notNullable();
    table.text('css_styles').nullable();
    table.text('config_options').notNullable().defaultTo('{}'); // JSON string
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Add indexes for performance
    table.index(['name']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('document_templates');
}