const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

async function createTestContent() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    db.serialize(() => {
      console.log('Creating test content with nested menu structure...');
      
      // Create parent page: Services
      db.run(`
        INSERT OR REPLACE INTO content (id, title, body, status, menu_order, show_in_menu, parent_id, menu_title, author_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
      `, [
        'content-services',
        'Our Services',
        '<h1>Our Services</h1><p>We provide a wide range of services to our community.</p>',
        'published',
        3,
        1,
        null,
        'Services',
        'admin-1'
      ]);

      // Create child pages under Services
      db.run(`
        INSERT OR REPLACE INTO content (id, title, body, status, menu_order, show_in_menu, parent_id, menu_title, author_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
      `, [
        'content-waste-management',
        'Waste Management',
        '<h1>Waste Management</h1><p>Information about our waste collection and recycling services.</p>',
        'published',
        1,
        1,
        'content-services',
        null,
        'admin-1'
      ]);

      db.run(`
        INSERT OR REPLACE INTO content (id, title, body, status, menu_order, show_in_menu, parent_id, menu_title, author_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
      `, [
        'content-planning',
        'Planning Applications',
        '<h1>Planning Applications</h1><p>Submit and track your planning applications online.</p>',
        'published',
        2,
        1,
        'content-services',
        null,
        'admin-1'
      ]);

      // Create a hidden page (not shown in menu)
      db.run(`
        INSERT OR REPLACE INTO content (id, title, body, status, menu_order, show_in_menu, parent_id, menu_title, author_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
      `, [
        'content-hidden',
        'Hidden Page',
        '<h1>Hidden Page</h1><p>This page is not shown in the menu but can be accessed via direct URL.</p>',
        'published',
        0,
        0,
        null,
        null,
        'admin-1'
      ]);

      console.log('✅ Test content created successfully!');
      console.log('');
      console.log('Created content:');
      console.log('• Welcome to Our Council (menu_order: 1)');
      console.log('• Contact Information (menu_order: 2)');
      console.log('• Services (menu_order: 3)');
      console.log('  ├── Waste Management (child of Services)');
      console.log('  └── Planning Applications (child of Services)');
      console.log('• Test Content (menu_order: 999)');
      console.log('• Hidden Page (not shown in menu)');

      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        resolve();
      });
    });
  });
}

createTestContent().catch(console.error);