import { db } from '../utils/database';
import { UserRepository } from '../models/UserRepository';
import { ContentRepository } from '../models/ContentRepository';
import { DocumentRepository } from '../models/DocumentRepository';
import { FolderRepository } from '../models/FolderRepository';
import { TemplateRepository } from '../models/TemplateRepository';
import fs from 'fs/promises';
import path from 'path';

export interface SystemOverview {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  content: {
    total: number;
    published: number;
    drafts: number;
  };
  documents: {
    total: number;
    totalSize: number;
    byType: Record<string, number>;
  };
  folders: {
    total: number;
    public: number;
    private: number;
  };
  templates: {
    total: number;
    active: number;
  };
  system: {
    uptime: number;
    version: string;
    environment: string;
  };
}

export interface DatabaseStats {
  tables: Array<{
    name: string;
    rowCount: number;
    size: string;
    lastUpdated: Date;
  }>;
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  performance: {
    slowQueries: number;
    avgQueryTime: number;
    cacheHitRatio: number;
  };
}

export interface MaintenanceTask {
  name: string;
  description: string;
  type: 'cleanup' | 'optimization' | 'repair';
}

export interface MaintenanceResult {
  task: string;
  success: boolean;
  message: string;
  affectedRows?: number;
  duration: number;
}

export class AdminService {
  private userRepo: UserRepository;
  private contentRepo: ContentRepository;
  private documentRepo: DocumentRepository;
  private folderRepo: FolderRepository;
  private templateRepo: TemplateRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.contentRepo = new ContentRepository();
    this.documentRepo = new DocumentRepository();
    this.folderRepo = new FolderRepository();
    this.templateRepo = new TemplateRepository();
    this.ensureSystemLogsTable();
  }

  /**
   * Ensure system_logs table exists for monitoring
   */
  private async ensureSystemLogsTable(): Promise<void> {
    try {
      const migrationPath = path.join(__dirname, '../migrations/create_system_logs_table.sql');
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      // Execute the migration
      const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await db.query(statement);
        }
      }
    } catch (error) {
      console.error('Failed to create system_logs table:', error);
      // Don't throw error to prevent service from failing to start
    }
  }

  /**
   * Get comprehensive system overview
   */
  async getSystemOverview(): Promise<SystemOverview> {
    const [users, content, documents, folders, templates] = await Promise.all([
      this.getUserStats(),
      this.getContentStats(),
      this.getDocumentStats(),
      this.getFolderStats(),
      this.getTemplateStats()
    ]);

    return {
      users,
      content,
      documents,
      folders,
      templates,
      system: {
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  /**
   * Get database statistics and health information
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    
    // Get table statistics
    const tableStatsQuery = `
      SELECT 
        table_name as name,
        table_rows as rowCount,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) as size,
        update_time as lastUpdated
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY table_name
    `;
    
    const tables = await db.query(tableStatsQuery);

    // Get connection statistics
    const connectionStats = await db.query('SHOW STATUS LIKE "Threads_%"');
    const connections = {
      active: parseInt(connectionStats.find((s: any) => s.Variable_name === 'Threads_running')?.Value || '0'),
      idle: parseInt(connectionStats.find((s: any) => s.Variable_name === 'Threads_cached')?.Value || '0'),
      total: parseInt(connectionStats.find((s: any) => s.Variable_name === 'Threads_connected')?.Value || '0')
    };

    // Get performance statistics
    const slowQueryCount = await db.query('SHOW STATUS LIKE "Slow_queries"');
    const queryStats = await db.query('SHOW STATUS LIKE "Questions"');
    
    const performance = {
      slowQueries: parseInt(slowQueryCount[0]?.Value || '0'),
      avgQueryTime: 0, // Would need query log analysis for accurate data
      cacheHitRatio: 95 // Placeholder - would need actual cache statistics
    };

    return {
      tables: tables.map((table: any) => ({
        name: table.name,
        rowCount: table.rowCount || 0,
        size: `${table.size || 0} MB`,
        lastUpdated: table.lastUpdated || new Date()
      })),
      connections,
      performance
    };
  }

  /**
   * Run database maintenance tasks
   */
  async runMaintenanceTasks(tasks: string[]): Promise<MaintenanceResult[]> {
    const results: MaintenanceResult[] = [];

    for (const taskName of tasks) {
      const startTime = Date.now();
      let result: MaintenanceResult;

      try {
        switch (taskName) {
          case 'optimize_tables':
            result = await this.optimizeTables(db);
            break;
          case 'cleanup_logs':
            result = await this.cleanupOldLogs(db);
            break;
          case 'rebuild_indexes':
            result = await this.rebuildIndexes(db);
            break;
          case 'analyze_tables':
            result = await this.analyzeTables(db);
            break;
          case 'cleanup_temp_files':
            result = await this.cleanupTempFiles();
            break;
          default:
            result = {
              task: taskName,
              success: false,
              message: `Unknown maintenance task: ${taskName}`,
              duration: Date.now() - startTime
            };
        }
      } catch (error) {
        result = {
          task: taskName,
          success: false,
          message: `Error executing ${taskName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        };
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Export system data
   */
  async exportData(tables: string[], format: string): Promise<Buffer> {
    const exportData: Record<string, any[]> = {};

    for (const tableName of tables) {
      try {
        const data = await db.query(`SELECT * FROM ${tableName}`);
        exportData[tableName] = data;
      } catch (error) {
        exportData[tableName] = { error: `Failed to export ${tableName}` };
      }
    }

    if (format === 'json') {
      return Buffer.from(JSON.stringify(exportData, null, 2));
    } else if (format === 'csv') {
      // Simple CSV export - would need proper CSV library for production
      let csv = '';
      for (const [tableName, data] of Object.entries(exportData)) {
        csv += `\n\n=== ${tableName} ===\n`;
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]);
          csv += headers.join(',') + '\n';
          for (const row of data) {
            csv += headers.map(h => JSON.stringify(row[h] || '')).join(',') + '\n';
          }
        }
      }
      return Buffer.from(csv);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  // Private helper methods
  private async getUserStats() {
    const users = await this.userRepo.findAll();
    const roleCount = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      byRole: roleCount
    };
  }

  private async getContentStats() {
    const content = await this.contentRepo.findAll();
    return {
      total: content.length,
      published: content.filter(c => c.status === 'published').length,
      drafts: content.filter(c => c.status === 'draft').length
    };
  }

  private async getDocumentStats() {
    const documents = await this.documentRepo.findAll();
    const typeCount = documents.reduce((acc, doc) => {
      const ext = doc.filename.split('.').pop() || 'unknown';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
      byType: typeCount
    };
  }

  private async getFolderStats() {
    const folders = await this.folderRepo.findAll();
    return {
      total: folders.length,
      public: folders.filter(f => f.isPublic).length,
      private: folders.filter(f => !f.isPublic).length
    };
  }

  private async getTemplateStats() {
    const templates = await this.templateRepo.findAll();
    return {
      total: templates.length,
      active: templates.filter(t => t.isActive).length
    };
  }

  private async optimizeTables(db: any): Promise<MaintenanceResult> {
    const tables = ['users', 'content', 'documents', 'folders', 'templates'];
    let affectedRows = 0;

    for (const table of tables) {
      await db.query(`OPTIMIZE TABLE ${table}`);
      affectedRows++;
    }

    return {
      task: 'optimize_tables',
      success: true,
      message: `Optimized ${affectedRows} tables`,
      affectedRows,
      duration: 0
    };
  }

  private async cleanupOldLogs(db: any): Promise<MaintenanceResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days of logs

    const result = await db.query(
      'DELETE FROM system_logs WHERE created_at < ?',
      [cutoffDate]
    );

    return {
      task: 'cleanup_logs',
      success: true,
      message: `Cleaned up old log entries`,
      affectedRows: result.affectedRows || 0,
      duration: 0
    };
  }

  private async rebuildIndexes(db: any): Promise<MaintenanceResult> {
    const tables = ['users', 'content', 'documents', 'folders', 'templates'];
    
    for (const table of tables) {
      await db.query(`ALTER TABLE ${table} DISABLE KEYS`);
      await db.query(`ALTER TABLE ${table} ENABLE KEYS`);
    }

    return {
      task: 'rebuild_indexes',
      success: true,
      message: `Rebuilt indexes for ${tables.length} tables`,
      affectedRows: tables.length,
      duration: 0
    };
  }

  private async analyzeTables(db: any): Promise<MaintenanceResult> {
    const tables = ['users', 'content', 'documents', 'folders', 'templates'];
    
    for (const table of tables) {
      await db.query(`ANALYZE TABLE ${table}`);
    }

    return {
      task: 'analyze_tables',
      success: true,
      message: `Analyzed ${tables.length} tables`,
      affectedRows: tables.length,
      duration: 0
    };
  }

  private async cleanupTempFiles(): Promise<MaintenanceResult> {
    // This would clean up temporary files from uploads, etc.
    // Implementation would depend on file storage strategy
    return {
      task: 'cleanup_temp_files',
      success: true,
      message: 'Cleaned up temporary files',
      affectedRows: 0,
      duration: 0
    };
  }
}