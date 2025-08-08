import { db } from '../utils/database';
import fs from 'fs/promises';
import path from 'path';

export interface LogEntry {
  id: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  source: string;
  userId?: string;
  requestId?: string;
}

export interface LogFilter {
  level?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
  source?: string;
  userId?: string;
}

export interface PerformanceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
  requests: {
    total: number;
    errors: number;
    avgResponseTime: number;
  };
  uptime: number;
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorTrends: Array<{
    date: string;
    count: number;
  }>;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
}

export class SystemMonitoringService {
  private logFilePath: string;

  constructor() {
    this.logFilePath = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  /**
   * Get system logs with filtering and pagination
   */
  async getLogs(filter: LogFilter): Promise<{
    logs: LogEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    
    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params: any[] = [];

    if (filter.level) {
      query += ' AND level = ?';
      params.push(filter.level);
    }

    if (filter.startDate) {
      query += ' AND created_at >= ?';
      params.push(new Date(filter.startDate));
    }

    if (filter.endDate) {
      query += ' AND created_at <= ?';
      params.push(new Date(filter.endDate));
    }

    if (filter.source) {
      query += ' AND source = ?';
      params.push(filter.source);
    }

    if (filter.userId) {
      query += ' AND user_id = ?';
      params.push(filter.userId);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [{ total }] = await db.query(countQuery, params);

    // Add pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(filter.limit, (filter.page - 1) * filter.limit);

    const logs = await db.query(query, params);

    return {
      logs: logs.map(this.mapLogEntry),
      total,
      page: filter.page,
      totalPages: Math.ceil(total / filter.limit)
    };
  }

  /**
   * Log a system event
   */
  async log(level: LogEntry['level'], message: string, metadata?: Record<string, any>, source = 'system', userId?: string, requestId?: string): Promise<void> {
    
    const logEntry = {
      id: this.generateId(),
      level,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      source,
      user_id: userId,
      request_id: requestId,
      created_at: new Date()
    };

    await db.query(
      'INSERT INTO system_logs (id, level, message, metadata, source, user_id, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [logEntry.id, logEntry.level, logEntry.message, logEntry.metadata, logEntry.source, logEntry.user_id, logEntry.request_id, logEntry.created_at]
    );

    // Also write to file for backup
    await this.writeToLogFile(logEntry);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(timeRange: string): Promise<PerformanceMetrics> {
    
    // Calculate time range
    const endTime = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case '1h':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case '24h':
        startTime.setDate(startTime.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(startTime.getDate() - 7);
        break;
      default:
        startTime.setHours(startTime.getHours() - 1);
    }

    // Get database metrics
    const dbStats = await this.getDatabaseMetrics();
    
    // Get request metrics from logs
    const requestMetrics = await this.getRequestMetrics(startTime, endTime);

    // Get system metrics
    const systemMetrics = this.getSystemMetrics();

    return {
      ...systemMetrics,
      database: dbStats,
      requests: requestMetrics,
      uptime: process.uptime()
    };
  }

  /**
   * Get error analysis
   */
  async getErrorAnalysis(timeRange: string): Promise<ErrorAnalysis> {
    
    const endTime = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case '1h':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case '24h':
        startTime.setDate(startTime.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(startTime.getDate() - 7);
        break;
      default:
        startTime.setDate(startTime.getDate() - 1);
    }

    // Get total error count
    const [{ totalErrors }] = await db.query(
      'SELECT COUNT(*) as totalErrors FROM system_logs WHERE level = "error" AND created_at BETWEEN ? AND ?',
      [startTime, endTime]
    );

    // Get errors by type (based on source)
    const errorsByType = await db.query(
      'SELECT source, COUNT(*) as count FROM system_logs WHERE level = "error" AND created_at BETWEEN ? AND ? GROUP BY source',
      [startTime, endTime]
    );

    // Get error trends (daily breakdown)
    const errorTrends = await db.query(`
      SELECT 
        DATE(created_at) as date, 
        COUNT(*) as count 
      FROM system_logs 
      WHERE level = "error" AND created_at BETWEEN ? AND ? 
      GROUP BY DATE(created_at) 
      ORDER BY date
    `, [startTime, endTime]);

    // Get top errors
    const topErrors = await db.query(`
      SELECT 
        message, 
        COUNT(*) as count, 
        MAX(created_at) as lastOccurred 
      FROM system_logs 
      WHERE level = "error" AND created_at BETWEEN ? AND ? 
      GROUP BY message 
      ORDER BY count DESC 
      LIMIT 10
    `, [startTime, endTime]);

    return {
      totalErrors,
      errorsByType: errorsByType.reduce((acc: Record<string, number>, item: any) => {
        acc[item.source] = item.count;
        return acc;
      }, {}),
      errorsByEndpoint: {}, // Would need request logging to populate this
      errorTrends: errorTrends.map((item: any) => ({
        date: item.date,
        count: item.count
      })),
      topErrors: topErrors.map((item: any) => ({
        message: item.message,
        count: item.count,
        lastOccurred: item.lastOccurred
      }))
    };
  }

  /**
   * Clear logs before a specific date
   */
  async clearLogsBeforeDate(beforeDate: Date): Promise<number> {
    
    const result = await db.query(
      'DELETE FROM system_logs WHERE created_at < ?',
      [beforeDate]
    );

    return result.affectedRows || 0;
  }

  // Private helper methods
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.access(this.logFilePath);
    } catch {
      await fs.mkdir(this.logFilePath, { recursive: true });
    }
  }

  private async writeToLogFile(logEntry: any): Promise<void> {
    const logFileName = `${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(this.logFilePath, logFileName);
    
    const logLine = `${logEntry.created_at.toISOString()} [${logEntry.level.toUpperCase()}] ${logEntry.source}: ${logEntry.message}${logEntry.metadata ? ` | ${logEntry.metadata}` : ''}\n`;
    
    try {
      await fs.appendFile(logFilePath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private mapLogEntry(row: any): LogEntry {
    return {
      id: row.id,
      level: row.level,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: row.created_at,
      source: row.source,
      userId: row.user_id,
      requestId: row.request_id
    };
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDatabaseMetrics(): Promise<PerformanceMetrics['database']> {
    
    try {
      const connectionStats = await db.query('SHOW STATUS LIKE "Threads_connected"');
      const slowQueryStats = await db.query('SHOW STATUS LIKE "Slow_queries"');
      
      return {
        connections: parseInt(connectionStats[0]?.Value || '0'),
        queryTime: 0, // Would need query profiling for accurate data
        slowQueries: parseInt(slowQueryStats[0]?.Value || '0')
      };
    } catch (error) {
      return {
        connections: 0,
        queryTime: 0,
        slowQueries: 0
      };
    }
  }

  private async getRequestMetrics(startTime: Date, endTime: Date): Promise<PerformanceMetrics['requests']> {
    
    try {
      // Get request logs (assuming we log requests)
      const [totalRequests] = await db.query(
        'SELECT COUNT(*) as total FROM system_logs WHERE source = "request" AND created_at BETWEEN ? AND ?',
        [startTime, endTime]
      );

      const [errorRequests] = await db.query(
        'SELECT COUNT(*) as total FROM system_logs WHERE level = "error" AND source = "request" AND created_at BETWEEN ? AND ?',
        [startTime, endTime]
      );

      return {
        total: totalRequests.total || 0,
        errors: errorRequests.total || 0,
        avgResponseTime: 0 // Would need response time logging
      };
    } catch (error) {
      return {
        total: 0,
        errors: 0,
        avgResponseTime: 0
      };
    }
  }

  private getSystemMetrics(): Pick<PerformanceMetrics, 'cpu' | 'memory'> {
    const memUsage = process.memoryUsage();
    
    return {
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
        loadAverage: require('os').loadavg()
      },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      }
    };
  }
}