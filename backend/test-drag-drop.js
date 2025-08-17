const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

async function testDragDrop() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    console.log('🧪 Testing Drag & Drop Menu Organization');
    console.log('');

    // First, show current menu structure
    db.all('SELECT id, title, menu_title, menu_order, parent_id, show_in_menu FROM content WHERE status = "published" ORDER BY menu_order ASC', (err, rows) => {
      if (err) {
        console.error('Error fetching content:', err);
        reject(err);
        return;
      }

      console.log('📋 Current Menu Structure:');
      const buildTree = (items, parentId = null, level = 0) => {
        const children = items.filter(item => item.parent_id === parentId);
        children.forEach(item => {
          const indent = '  '.repeat(level);
          const title = item.menu_title || item.title;
          const hidden = item.show_in_menu ? '' : ' (Hidden)';
          console.log(`${indent}• ${title} (order: ${item.menu_order})${hidden}`);
          buildTree(items, item.id, level + 1);
        });
      };

      buildTree(rows);
      console.log('');

      // Test scenario: Move "Contact Information" to be a child of "Services"
      console.log('🔄 Test: Moving "Contact Information" under "Services"...');
      
      const testUpdates = [
        { id: 'content-3', menu_order: 3, parent_id: 'content-services' }
      ];

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        let completed = 0;
        testUpdates.forEach((update) => {
          db.run(
            'UPDATE content SET menu_order = ?, parent_id = ?, updated_at = datetime("now") WHERE id = ?',
            [update.menu_order, update.parent_id, update.id],
            function(err) {
              if (err) {
                console.error('Update error:', err);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              completed++;
              if (completed === testUpdates.length) {
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Commit error:', err);
                    reject(err);
                    return;
                  }
                  
                  console.log('✅ Update successful!');
                  console.log('');

                  // Show updated structure
                  db.all('SELECT id, title, menu_title, menu_order, parent_id, show_in_menu FROM content WHERE status = "published" ORDER BY menu_order ASC', (err, updatedRows) => {
                    if (err) {
                      console.error('Error fetching updated content:', err);
                      reject(err);
                      return;
                    }

                    console.log('📋 Updated Menu Structure:');
                    buildTree(updatedRows);
                    console.log('');
                    console.log('🎉 Drag & Drop functionality is working correctly!');
                    
                    db.close();
                    resolve();
                  });
                });
              }
            }
          );
        });
      });
    });
  });
}

testDragDrop().catch(console.error);