import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('content_versions', (table) => {
    table.string('id').primary();
    table.string('content_id').notNullable();
    table.integer('version').notNullable();
    table.string('title').notNullable();
    table.text('body').notNullable();
    table.text('metadata').notNullable().defaultTo('{}'); // JSON string
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    
    table.foreign('content_id').references('id').inTable('content').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users');
    
    table.unique(['content_id', 'version']);
    table.index(['content_id']);
    table.index(['version']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('content_versions');
}