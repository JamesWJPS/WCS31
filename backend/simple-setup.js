const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');

async function setupDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('administrator', 'editor', 'read-only')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        reject(err);
        return;
      }
      console.log('Users table created');

      // Hash passwords and insert users
      Promise.all([
        bcrypt.hash('admin123', 12),
        bcrypt.hash('editor123', 12),
        bcrypt.hash('readonly123', 12)
      ]).then(([adminHash, editorHash, readonlyHash]) => {
        
        // Clear existing users first
        db.run('DELETE FROM users', (err) => {
          if (err) console.log('Note: Could not clear existing users');

          // Insert new users
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO users (id, username, email, password, role)
            VALUES (?, ?, ?, ?, ?)
          `);

          stmt.run('admin-1', 'admin', 'admin@example.com', adminHash, 'administrator');
          stmt.run('editor-1', 'editor', 'editor@example.com', editorHash, 'editor');
          stmt.run('readonly-1', 'readonly', 'readonly@example.com', readonlyHash, 'read-only');
          
          stmt.finalize((err) => {
            if (err) {
              console.error('Error inserting users:', err);
              reject(err);
              return;
            }

            console.log('✅ Database setup complete!');
            console.log('');
            console.log('🎉 You can now log in with:');
            console.log('👤 Admin: username="admin", password="admin123"');
            console.log('✏️  Editor: username="editor", password="editor123"');
            console.log('👁️  Read-only: username="readonly", password="readonly123"');
            console.log('');
            console.log('🌐 Access the CMS at: http://localhost:5173');

            db.close((err) => {
              if (err) console.error('Error closing database:', err);
              resolve();
            });
          });
        });
      }).catch(reject);
    });
  });
}

setupDatabase().catch(console.error);