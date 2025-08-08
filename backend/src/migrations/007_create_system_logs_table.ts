import { database } from '../utils/database';

export async function up(): Promise<void> {
  const db = database.getConnection();
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id VARCHAR(255) PRIMARY KEY,
      level ENUM('error', 'warn', 'info', 'debug') NOT NULL,
      message TEXT NOT NULL,
      metadata JSON,
      source VARCHAR(100) NOT NULL DEFAULT 'system',
      user_id VARCHAR(255),
      request_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_level (level),
      INDEX idx_source (source),
      INDEX idx_created_at (created_at),
      INDEX idx_user_id (user_id),
      INDEX idx_request_id (request_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

export async function down(): Promise<void> {
  const db = database.getConnection();
  await db.query('DROP TABLE IF EXISTS system_logs');
}