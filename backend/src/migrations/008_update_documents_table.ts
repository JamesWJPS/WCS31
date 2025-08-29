import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('documents', (table) => {
    // Add missing fields from the design document
    table.string('title').nullable();
    table.text('description').nullable();
    table.text('tags').nullable().defaultTo('[]'); // JSON array as string
    
    // Add performance indexes as specified in requirements
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('documents', (table) => {
    table.dropColumn('title');
    table.dropColumn('description');
    table.dropColumn('tags');
    table.dropIndex(['created_at']);
  });
}