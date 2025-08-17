const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Check tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    return;
  }
  
  console.log('📋 Database tables:');
  tables.forEach(table => {
    console.log(`  • ${table.name}`);
  });
  
  // Check content count
  db.get("SELECT COUNT(*) as count FROM content", (err, result) => {
    if (err) {
      console.error('Error counting content:', err);
    } else {
      console.log(`📝 Content items: ${result.count}`);
    }
    
    // Check documents count
    db.get("SELECT COUNT(*) as count FROM documents", (err, result) => {
      if (err) {
        console.error('Error counting documents:', err);
      } else {
        console.log(`📄 Documents: ${result.count}`);
      }
      
      // Check users count
      db.get("SELECT COUNT(*) as count FROM users", (err, result) => {
        if (err) {
          console.error('Error counting users:', err);
        } else {
          console.log(`👥 Users: ${result.count}`);
        }
        
        db.close();
      });
    });
  });
});