import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('folders', (table) => {
    // Add path field for efficient tree operations
    table.string('path', 500).notNullable().defaultTo('/');
    
    // Add performance indexes as specified in requirements
    table.index(['path']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('folders', (table) => {
    table.dropColumn('path');
    table.dropIndex(['path']);
  });
}