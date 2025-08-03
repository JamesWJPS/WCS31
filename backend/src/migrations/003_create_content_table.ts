import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('content', (table) => {
    table.string('id').primary();
    table.string('title').notNullable();
    table.string('slug').notNullable().unique();
    table.text('body').notNullable();
    table.string('template_id').notNullable();
    table.string('author_id').notNullable();
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.text('metadata').notNullable().defaultTo('{}'); // JSON string
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('published_at').nullable();
    
    table.foreign('template_id').references('id').inTable('templates');
    table.foreign('author_id').references('id').inTable('users');
    
    table.index(['slug']);
    table.index(['status']);
    table.index(['author_id']);
    table.index(['template_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('content');
}