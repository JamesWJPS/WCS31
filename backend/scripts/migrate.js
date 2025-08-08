const { knex } = require('../dist/utils/database');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Run migrations
    await knex.migrate.latest({
      directory: './dist/migrations',
      extension: 'js'
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

runMigrations();