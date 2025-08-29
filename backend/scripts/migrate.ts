import { db } from '../src/utils/database';

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Run migrations
    await db.migrate.latest();
    
    console.log('Database migrations completed successfully');
    
    // Check migration status
    const currentVersion = await db.migrate.currentVersion();
    console.log(`Current migration version: ${currentVersion}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };