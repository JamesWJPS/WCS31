const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

async function testBulkUpdate() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    console.log('🧪 Testing Bulk Update Logic');
    
    // First, show current state
    db.get('SELECT id, title, menu_order, parent_id FROM content WHERE id = ?', ['content-1'], (err, row) => {
      if (err) {
        console.error('Error fetching content:', err);
        reject(err);
        return;
      }
      
      console.log('📋 Current state of content-1:');
      console.log(`   Title: ${row.title}`);
      console.log(`   Menu Order: ${row.menu_order}`);
      console.log(`   Parent ID: ${row.parent_id}`);
      
      // Now try to update it
      console.log('\n🔄 Attempting to update menu_order to 15...');
      
      db.run(
        'UPDATE content SET menu_order = ?, parent_id = ?, updated_at = datetime("now") WHERE id = ?',
        [15, null, 'content-1'],
        function(err) {
          if (err) {
            console.error('❌ Update error:', err);
            reject(err);
            return;
          }
          
          console.log(`✅ Update completed: ${this.changes} rows affected`);
          
          // Check the result
          db.get('SELECT id, title, menu_order, parent_id FROM content WHERE id = ?', ['content-1'], (err, updatedRow) => {
            if (err) {
              console.error('Error fetching updated content:', err);
              reject(err);
              return;
            }
            
            console.log('\n📋 Updated state of content-1:');
            console.log(`   Title: ${updatedRow.title}`);
            console.log(`   Menu Order: ${updatedRow.menu_order}`);
            console.log(`   Parent ID: ${updatedRow.parent_id}`);
            
            if (updatedRow.menu_order === 15) {
              console.log('\n🎉 SUCCESS: Database update is working!');
            } else {
              console.log('\n❌ FAILURE: Database update did not work');
            }
            
            db.close();
            resolve();
          });
        }
      );
    });
  });
}

testBulkUpdate().catch(console.error);