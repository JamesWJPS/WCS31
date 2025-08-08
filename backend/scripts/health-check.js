const { knex } = require('../dist/utils/database');
const fs = require('fs');
const path = require('path');

async function healthCheck() {
  try {
    // Check database connection
    await knex.raw('SELECT 1');
    console.log('✓ Database connection healthy');
    
    // Check if required tables exist
    const tables = ['users', 'content', 'templates', 'documents', 'folders'];
    for (const table of tables) {
      const exists = await knex.schema.hasTable(table);
      if (!exists) {
        throw new Error(`Required table '${table}' does not exist`);
      }
    }
    console.log('✓ Database schema healthy');
    
    // Check if admin user exists
    const adminUser = await knex('users').where({ role: 'administrator' }).first();
    if (!adminUser) {
      console.warn('⚠ No administrator user found');
    } else {
      console.log('✓ Administrator user exists');
    }
    
    // Check file upload directory
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const resolvedUploadDir = path.resolve(uploadDir);
    
    if (!fs.existsSync(resolvedUploadDir)) {
      fs.mkdirSync(resolvedUploadDir, { recursive: true });
      console.log('✓ Created upload directory');
    } else {
      console.log('✓ Upload directory exists');
    }
    
    console.log('🎉 Health check passed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

healthCheck();