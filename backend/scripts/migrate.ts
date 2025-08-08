import { knex } from '../src/utils/database';
import config from '../src/config/environment';

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Run migrations
    await knex.migrate.latest({
      directory: './src/migrations',
      extension: 'ts'
    });
    
    console.log('Database migrations completed successfully');
    
    // Check migration status
    const [batchNo, migrations] = await knex.migrate.currentVersion();
    console.log(`Current migration batch: ${batchNo}`);
    console.log(`Applied migrations: ${migrations.length}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };