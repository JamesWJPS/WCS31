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

        // Create all tables
        db.serialize(() => {
            // Users table
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
      `);

            // Content table
            db.run(`
        CREATE TABLE IF NOT EXISTS content (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          body TEXT,
          slug TEXT UNIQUE,
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
          author_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (author_id) REFERENCES users (id)
        )
      `);

            // Documents table
            db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          filename TEXT NOT NULL,
          path TEXT NOT NULL,
          size INTEGER,
          mimetype TEXT,
          uploaded_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (uploaded_by) REFERENCES users (id)
        )
      `);

            console.log('All tables created successfully');

            // Hash passwords and insert users
            Promise.all([
                bcrypt.hash('admin123', 12),
                bcrypt.hash('editor123', 12),
                bcrypt.hash('readonly123', 12)
            ]).then(([adminHash, editorHash, readonlyHash]) => {

                // Clear existing data
                db.run('DELETE FROM users');
                db.run('DELETE FROM content');
                db.run('DELETE FROM documents');

                // Insert users
                const userStmt = db.prepare(`
          INSERT INTO users (id, username, email, password, role)
          VALUES (?, ?, ?, ?, ?)
        `);

                userStmt.run('admin-1', 'admin', 'admin@example.com', adminHash, 'administrator');
                userStmt.run('editor-1', 'editor', 'editor@example.com', editorHash, 'editor');
                userStmt.run('readonly-1', 'readonly', 'readonly@example.com', readonlyHash, 'read-only');
                userStmt.finalize();

                // Insert sample content
                const contentStmt = db.prepare(`
          INSERT INTO content (id, title, body, status, author_id)
          VALUES (?, ?, ?, ?, ?)
        `);

                contentStmt.run('content-1', 'Welcome to Our Council', 'Welcome to our town council website. Here you can find information about our services, meetings, and community initiatives.', 'published', 'admin-1');
                contentStmt.run('content-2', 'About Our Council', 'Learn more about our council members, history, and mission to serve our community.', 'draft', 'admin-1');
                contentStmt.run('content-3', 'Contact Information', 'Find out how to get in touch with us for various services and inquiries.', 'published', 'admin-1');
                contentStmt.finalize();

                // Insert sample documents
                const docStmt = db.prepare(`
          INSERT INTO documents (id, title, filename, path, size, mimetype, uploaded_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

                docStmt.run('doc-1', 'Meeting Minutes January 2025', 'meeting-minutes-jan-2025.pdf', '/uploads/meeting-minutes-jan-2025.pdf', 245760, 'application/pdf', 'admin-1');
                docStmt.run('doc-2', 'Budget Report 2025', 'budget-report-2025.xlsx', '/uploads/budget-report-2025.xlsx', 1258291, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'admin-1');
                docStmt.run('doc-3', 'Council Policies', 'council-policies.docx', '/uploads/council-policies.docx', 912384, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'admin-1');
                docStmt.finalize();

                console.log('✅ Database setup complete with sample data!');
                console.log('');
                console.log('🎉 You can now log in with:');
                console.log('👤 Admin: username="admin", password="admin123"');
                console.log('✏️  Editor: username="editor", password="editor123"');
                console.log('👁️  Read-only: username="readonly", password="readonly123"');
                console.log('');
                console.log('📊 Sample data includes:');
                console.log('   • 3 users with different roles');
                console.log('   • 3 sample content items');
                console.log('   • 3 sample documents');
                console.log('');
                console.log('🌐 Access the CMS at: http://localhost:5173');

                db.close((err) => {
                    if (err) console.error('Error closing database:', err);
                    resolve();
                });
            }).catch(reject);
        });
    });
}

setupDatabase().catch(console.error);