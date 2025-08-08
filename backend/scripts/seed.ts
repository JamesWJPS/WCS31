import { knex } from '../src/utils/database';
import { hashPassword } from '../src/utils/password';
import config from '../src/config/environment';

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Clear existing data in development
    if (config.NODE_ENV === 'development') {
      console.log('Clearing existing data...');
      await knex('content').del();
      await knex('documents').del();
      await knex('folders').del();
      await knex('templates').del();
      await knex('users').del();
    }
    
    // Seed admin user
    const adminPassword = await hashPassword('admin123');
    const adminUser = await knex('users').insert({
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      password_hash: adminPassword,
      role: 'administrator',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    console.log('Created admin user');
    
    // Seed editor user
    const editorPassword = await hashPassword('editor123');
    const editorUser = await knex('users').insert({
      id: '2',
      username: 'editor',
      email: 'editor@example.com',
      password_hash: editorPassword,
      role: 'editor',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    console.log('Created editor user');
    
    // Seed read-only user
    const readOnlyPassword = await hashPassword('readonly123');
    const readOnlyUser = await knex('users').insert({
      id: '3',
      username: 'readonly',
      email: 'readonly@example.com',
      password_hash: readOnlyPassword,
      role: 'read-only',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    console.log('Created read-only user');
    
    // Seed default template
    const defaultTemplate = await knex('templates').insert({
      id: '1',
      name: 'Default Page Template',
      description: 'WCAG 2.2 compliant default template for council pages',
      html_structure: `
        <article role="main">
          <header>
            <h1>{{title}}</h1>
          </header>
          <div class="content">
            {{content}}
          </div>
          <footer>
            <p>Last updated: {{updated_at}}</p>
          </footer>
        </article>
      `,
      css_styles: `
        article { max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1 { color: #2c3e50; margin-bottom: 1rem; }
        .content { line-height: 1.6; margin-bottom: 2rem; }
        footer { border-top: 1px solid #eee; padding-top: 1rem; color: #666; }
      `,
      accessibility_features: JSON.stringify({
        skipLinks: true,
        headingStructure: true,
        altTextRequired: true,
        colorContrastCompliant: true
      }),
      content_fields: JSON.stringify([
        { id: 'title', name: 'Title', type: 'text', required: true },
        { id: 'content', name: 'Content', type: 'rich-text', required: true }
      ]),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    console.log('Created default template');
    
    // Seed sample content
    const sampleContent = await knex('content').insert({
      id: '1',
      title: 'Welcome to Our Council Website',
      slug: 'welcome',
      body: '<p>Welcome to our town council website. Here you can find information about council meetings, local services, and community events.</p>',
      template_id: '1',
      author_id: '1',
      status: 'published',
      metadata: JSON.stringify({
        description: 'Welcome page for the council website',
        keywords: ['council', 'welcome', 'community']
      }),
      created_at: new Date(),
      updated_at: new Date(),
      published_at: new Date()
    }).returning('*');
    
    console.log('Created sample content');
    
    // Seed folder structure
    const publicFolder = await knex('folders').insert({
      id: '1',
      name: 'Public Documents',
      parent_id: null,
      is_public: true,
      permissions: JSON.stringify({
        read: ['*'],
        write: ['administrator', 'editor']
      }),
      created_by: '1',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    const privateFolder = await knex('folders').insert({
      id: '2',
      name: 'Private Documents',
      parent_id: null,
      is_public: false,
      permissions: JSON.stringify({
        read: ['administrator', 'editor'],
        write: ['administrator']
      }),
      created_by: '1',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    console.log('Created folder structure');
    
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

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };