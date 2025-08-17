const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

async function updateContentSchema() {
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
      // Add new columns to content table
      console.log('Adding new columns to content table...');
      
      // Add menu_order column (for ordering pages in menu)
      db.run(`ALTER TABLE content ADD COLUMN menu_order INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding menu_order column:', err);
        } else {
          console.log('✓ Added menu_order column');
        }
      });

      // Add show_in_menu column (to hide/show pages in menu)
      db.run(`ALTER TABLE content ADD COLUMN show_in_menu INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding show_in_menu column:', err);
        } else {
          console.log('✓ Added show_in_menu column');
        }
      });

      // Add parent_id column (for nested menu structure)
      db.run(`ALTER TABLE content ADD COLUMN parent_id TEXT DEFAULT NULL`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding parent_id column:', err);
        } else {
          console.log('✓ Added parent_id column');
        }
      });

      // Add menu_title column (optional different title for menu)
      db.run(`ALTER TABLE content ADD COLUMN menu_title TEXT DEFAULT NULL`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding menu_title column:', err);
        } else {
          console.log('✓ Added menu_title column');
        }
      });

      // Update existing content with default menu_order values
      db.run(`UPDATE content SET menu_order = 
        CASE 
          WHEN id = 'content-1' THEN 1
          WHEN id = 'content-3' THEN 2
          ELSE 999
        END
        WHERE menu_order = 0`, (err) => {
        if (err) {
          console.error('Error updating menu_order:', err);
        } else {
          console.log('✓ Updated existing content with menu order');
        }
      });

      console.log('✅ Content schema update complete!');
      console.log('');
      console.log('New features available:');
      console.log('• menu_order: Controls the order of pages in the menu');
      console.log('• show_in_menu: 1 = show in menu, 0 = hidden (accessible via URL only)');
      console.log('• parent_id: ID of parent page for nested menu structure');
      console.log('• menu_title: Optional different title to display in menu');

      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        resolve();
      });
    });
  });
}

updateContentSchema().catch(console.error);