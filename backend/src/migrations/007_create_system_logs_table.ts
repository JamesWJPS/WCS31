import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('system_logs', (table) => {
    table.string('id').primary();
    table.enum('level', ['error', 'warn', 'info', 'debug']).notNullable();
    table.text('message').notNullable();
    table.json('metadata');
    table.string('source', 100).notNullable().defaultTo('system');
    table.string('user_id');
    table.string('request_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('level');
    table.index('source');
    table.index('created_at');
    table.index('user_id');
    table.index('request_id');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('system_logs');
}