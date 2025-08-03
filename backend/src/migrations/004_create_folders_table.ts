import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('folders', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('parent_id').nullable();
    table.boolean('is_public').defaultTo(false);
    table.text('permissions').notNullable().defaultTo('{"read":[],"write":[]}'); // JSON string
    table.string('created_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('parent_id').references('id').inTable('folders');
    table.foreign('created_by').references('id').inTable('users');
    
    table.index(['parent_id']);
    table.index(['is_public']);
    table.index(['created_by']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('folders');
}