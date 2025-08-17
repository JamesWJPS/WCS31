const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware - Explicit CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'dev.db');
const db = new sqlite3.Database(dbPath);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password: '***' });

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: { message: 'Username and password are required' }
    });
  }

  // Find user
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: { message: 'Database error' }
      });
    }

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials' }
      });
    }

    try {
      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        console.log('Invalid password for user:', username);
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials' }
        });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        'dev-secret-key',
        { expiresIn: '24h' }
      );

      console.log('Login successful for user:', username);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });

    } catch (error) {
      console.error('Password comparison error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Authentication error' }
      });
    }
  });
});

// Content Management Endpoints
app.get('/api/content', (req, res) => {
  const { public_only } = req.query;
  
  let query = 'SELECT * FROM content';
  let orderBy = ' ORDER BY menu_order ASC, created_at DESC';
  
  if (public_only === 'true') {
    // For public view: only published content that should show in menu
    query += ' WHERE status = "published" AND show_in_menu = 1';
  }
  
  query += orderBy;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: 'Database error' } });
    }
    res.json({ success: true, data: rows || [] });
  });
});

// Get content by slug/id for direct URL access
app.get('/api/content/:identifier', (req, res) => {
  const { identifier } = req.params;
  
  // Try to find by slug first, then by id
  db.get('SELECT * FROM content WHERE slug = ? OR id = ?', [identifier, identifier], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: 'Database error' } });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: { message: 'Content not found' } });
    }
    res.json({ success: true, data: row });
  });
});

app.post('/api/content', (req, res) => {
  const { title, body, status, menu_order, show_in_menu, parent_id, menu_title, slug } = req.body;
  const id = 'content-' + Date.now();
  
  db.run(
    `INSERT INTO content (id, title, body, slug, status, menu_order, show_in_menu, parent_id, menu_title, author_id, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
    [
      id, 
      title, 
      body || '', 
      slug || null,
      status || 'draft', 
      menu_order || 0, 
      show_in_menu !== undefined ? show_in_menu : 1, 
      parent_id || null, 
      menu_title || null, 
      'admin-1'
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: { message: 'Failed to create content' } });
      }
      res.json({ success: true, data: { id, title, body, status, menu_order, show_in_menu, parent_id, menu_title, slug } });
    }
  );
});

// Bulk update content (for drag-and-drop reordering) - MUST come before /:id route
app.put('/api/content/bulk-update', (req, res) => {
  console.log('🔄 Bulk update request received:', req.body);
  
  const { contents } = req.body;
  
  if (!Array.isArray(contents)) {
    console.log('❌ Contents is not an array');
    return res.status(400).json({ success: false, error: { message: 'Contents must be an array' } });
  }

  if (contents.length === 0) {
    console.log('⚠️ No content to update');
    return res.json({ success: true, message: 'No content to update' });
  }

  console.log(`📝 Processing ${contents.length} content items`);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('❌ Transaction begin error:', err);
        return res.status(500).json({ success: false, error: { message: 'Failed to begin transaction' } });
      }
      
      console.log('✅ Transaction started');
    });
    
    let completed = 0;
    let hasError = false;
    let responseSent = false;
    
    const handleCompletion = () => {
      completed++;
      console.log(`📊 Progress: ${completed}/${contents.length} completed`);
      
      if (completed === contents.length && !hasError && !responseSent) {
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('❌ Commit error:', err);
            responseSent = true;
            return res.status(500).json({ success: false, error: { message: 'Failed to commit transaction' } });
          }
          
          console.log('🎉 All updates committed successfully');
          responseSent = true;
          res.json({ success: true, message: 'Content order updated successfully' });
        });
      }
    };
    
    contents.forEach((content, index) => {
      console.log(`🔄 [${index + 1}/${contents.length}] Updating content: ${content.id}, menu_order: ${content.menu_order}, parent_id: ${content.parent_id}`);
      
      db.run(
        `UPDATE content SET menu_order = ?, parent_id = ?, updated_at = datetime("now") WHERE id = ?`,
        [content.menu_order || 0, content.parent_id || null, content.id],
        function(err) {
          if (err && !hasError) {
            hasError = true;
            console.error('❌ Update error:', err);
            db.run('ROLLBACK');
            if (!responseSent) {
              responseSent = true;
              return res.status(500).json({ success: false, error: { message: 'Failed to update content order' } });
            }
            return;
          }
          
          console.log(`✅ Updated content ${content.id}: ${this.changes} rows affected`);
          
          if (!hasError) {
            handleCompletion();
          }
        }
      );
    });
  });
});

app.put('/api/content/:id', (req, res) => {
  const { title, body, status, menu_order, show_in_menu, parent_id, menu_title, slug } = req.body;
  const { id } = req.params;
  
  db.run(
    `UPDATE content SET title = ?, body = ?, slug = ?, status = ?, menu_order = ?, show_in_menu = ?, parent_id = ?, menu_title = ?, updated_at = datetime("now") 
     WHERE id = ?`,
    [
      title, 
      body || '', 
      slug || null,
      status || 'draft', 
      menu_order || 0, 
      show_in_menu !== undefined ? show_in_menu : 1, 
      parent_id || null, 
      menu_title || null, 
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: { message: 'Failed to update content' } });
      }
      res.json({ success: true, data: { id, title, body, status, menu_order, show_in_menu, parent_id, menu_title, slug } });
    }
  );
});

app.delete('/api/content/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM content WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: { message: 'Failed to delete content' } });
    }
    res.json({ success: true, message: 'Content deleted' });
  });
});

// User Management Endpoints
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: 'Database error' } });
    }
    res.json({ success: true, data: rows || [] });
  });
});

app.post('/api/users', async (req, res) => {
  const { username, email, role, password } = req.body;
  const id = 'user-' + Date.now();
  
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    db.run(
      'INSERT INTO users (id, username, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
      [id, username, email, hashedPassword, role],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ success: false, error: { message: 'Username or email already exists' } });
          }
          return res.status(500).json({ success: false, error: { message: 'Failed to create user' } });
        }
        res.json({ success: true, data: { id, username, email, role } });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Password hashing failed' } });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { username, email, role, password } = req.body;
  const { id } = req.params;
  
  try {
    let query = 'UPDATE users SET username = ?, email = ?, role = ?, updated_at = datetime("now") WHERE id = ?';
    let params = [username, email, role, id];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      query = 'UPDATE users SET username = ?, email = ?, role = ?, password = ?, updated_at = datetime("now") WHERE id = ?';
      params = [username, email, role, hashedPassword, id];
    }
    
    db.run(query, params, function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: { message: 'Failed to update user' } });
      }
      res.json({ success: true, data: { id, username, email, role } });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Update failed' } });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: { message: 'Failed to delete user' } });
    }
    res.json({ success: true, message: 'User deleted' });
  });
});

// Document Management Endpoints
app.get('/api/documents', (req, res) => {
  db.all('SELECT * FROM documents ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: 'Database error' } });
    }
    res.json({ success: true, data: rows || [] });
  });
});

app.post('/api/documents', (req, res) => {
  const { title, filename, size, mimetype } = req.body;
  const id = 'doc-' + Date.now();
  
  db.run(
    'INSERT INTO documents (id, title, filename, path, size, mimetype, uploaded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
    [id, title || filename, filename, '/uploads/' + filename, size || 0, mimetype || 'application/octet-stream', 'admin-1'],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: { message: 'Failed to create document' } });
      }
      res.json({ success: true, data: { id, title, filename, size, mimetype } });
    }
  );
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM documents WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: { message: 'Failed to delete document' } });
    }
    res.json({ success: true, message: 'Document deleted' });
  });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'No token provided' }
    });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, 'dev-secret-key');
    
    db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err || !user) {
        return res.status(401).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid token' }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
});

// Handle errors
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error' }
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  db.close();
  process.exit(0);
});