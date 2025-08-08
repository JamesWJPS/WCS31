-- Create system_logs table for admin monitoring
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
  INDEX idx_request_id (request_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created ON system_logs(level, created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_source_created ON system_logs(source, created_at);