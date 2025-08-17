const knex = require('knex');
const bcrypt = require('bcrypt');
const path = require('path');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'dev.db'),
  },
  useNullAsDefault: true,
});

async function setupDatabase() {
  try {
    console.log('Setting up database...');

    // Create users table
    await db.schema.dropTableIfExists('users');
    await db.schema.createTable('users', (table) => {
      table.string('id').primary();
      table.string('username').unique().notNullable();
      table.string('email').unique().notNullable();
      table.string('password').notNullable();
      table.enum('role', ['administrator', 'editor', 'read-only']).notNullable();
      table.timestamps(true, true);
    });

    // Create content table
    await db.schema.dropTableIfExists('content');
    await db.schema.createTable('content', (table) => {
      table.string('id').primary();
      table.string('title').notNullable();
      table.text('body');
      table.string('slug').unique();
      table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
      table.string('author_id').references('id').inTable('users');
      table.timestamps(true, true);
    });

    // Create documents table
    await db.schema.dropTableIfExists('documents');
    await db.schema.createTable('documents', (table) => {
      table.string('id').primary();
      table.string('title').notNullable();
      table.string('filename').notNullable();
      table.string('path').notNullable();
      table.integer('size');
      table.string('mimetype');
      table.string('uploaded_by').references('id').inTable('users');
      table.timestamps(true, true);
    });

    console.log('Tables created successfully');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 12);
    const editorPassword = await bcrypt.hash('editor123', 12);
    const readonlyPassword = await bcrypt.hash('readonly123', 12);

    // Insert default users
    await db('users').insert([
      {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'administrator'
      },
      {
        id: 'editor-1',
        username: 'editor',
        email: 'editor@example.com',
        password: editorPassword,
        role: 'editor'
      },
      {
        id: 'readonly-1',
        username: 'readonly',
        email: 'readonly@example.com',
        password: readonlyPassword,
        role: 'read-only'
      }
    ]);

    console.log('Default users created successfully');
    console.log('');
    console.log('🎉 Database setup complete!');
    console.log('');
    console.log('You can now log in with:');
    console.log('👤 Admin: username="admin", password="admin123"');
    console.log('✏️  Editor: username="editor", password="editor123"');
    console.log('👁️  Read-only: username="readonly", password="readonly123"');
    console.log('');
    console.log('Access the CMS at: http://localhost:5173');

  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await db.destroy();
  }
}

setupDatabase();