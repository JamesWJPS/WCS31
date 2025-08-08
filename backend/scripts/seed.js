const { knex } = require('../dist/utils/database');
const { hashPassword } = require('../dist/utils/password');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Clear existing data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Clearing existing data...');
      await knex('content').del();
      await knex('documents').del();
      await knex('folders').del();
      await knex('templates').del();
      await knex('users').del();
    }
    
    // Seed admin user
    const adminPassword = await hashPassword('admin123');
    await knex('users').insert({
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      password_hash: adminPassword,
      role: 'administrator',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log('Created admin user');
    
    // Seed editor user
    const editorPassword = await hashPassword('editor123');
    await knex('users').insert({
      id: '2',
      username: 'editor',
      email: 'editor@example.com',
      password_hash: editorPassword,
      role: 'editor',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log('Created editor user');
    
    // Seed read-only user
    const readOnlyPassword = await hashPassword('readonly123');
    await knex('users').insert({
      id: '3',
      username: 'readonly',
      email: 'readonly@example.com',
      password_hash: readOnlyPassword,
      role: 'read-only',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log('Created read-only user');
    
    console.log('Database seeding completed successfully');
    console.log('Default credentials:');
    console.log('  Admin: admin / admin123');
    console.log('  Editor: editor / editor123');
    console.log('  Read-only: readonly / readonly123');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

seedDatabase();