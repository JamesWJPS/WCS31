import knex, { Knex } from 'knex';
import path from 'path';

const config: Knex.Config = {
  client: 'sqlite3',
  connection: {
    filename: process.env['DATABASE_PATH'] || path.join(__dirname, '../../data/cms.db'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, '../migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, '../seeds'),
    extension: 'ts',
  },
};

const db = knex(config);

export default db;
export { config };