const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Created logs directory');
}

// Create a simple SQLite database file
const dbPath = path.join(__dirname, 'dev.db');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '');
  console.log('Created SQLite database file');
}

console.log('Development environment setup complete!');