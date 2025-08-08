import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { SystemMonitoringService } from '../services/SystemMonitoringService';
import { DataIntegrityService } from '../services/DataIntegrityService';
import { AppError } from '../utils/AppError';

export class AdminController {
  private adminService: AdminService;
  private monitoringService: SystemMonitoringService;
  private dataIntegrityService: DataIntegrityService;

  constructor() {
    this.adminService = new AdminService();
    this.monitoringService = new SystemMonitoringService();
    this.dataIntegrityService = new DataIntegrityService();
  }

  /**
   * Get system overview and health status
   */
  async getSystemOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await this.adminService.getSystemOverview();
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      throw new AppError('Failed to get system overview', 500);
    }
  }

  /**
   * Get system logs with filtering and pagination
   */
  async getSystemLogs(req: Request, res: Response): Promise<void> {
    try {
      const { level, startDate, endDate, page = 1, limit = 50 } = req.query;
      
      const logs = await this.monitoringService.getLogs({
        level: level as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      throw new AppError('Failed to retrieve system logs', 500);
    }
  }

  /**
   * Get database statistics and health
   */
  async getDatabaseStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.adminService.getDatabaseStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      throw new AppError('Failed to get database statistics', 500);
    }
  }

  /**
   * Run data integrity checks
   */
  async runDataIntegrityCheck(req: Request, res: Response): Promise<void> {
    try {
      const results = await this.dataIntegrityService.runIntegrityCheck();
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      throw new AppError('Failed to run data integrity check', 500);
    }
  }

  /**
   * Repair data integrity issues
   */
  async repairDataIntegrity(req: Request, res: Response): Promise<void> {
    try {
      const { issueIds } = req.body;
      
      if (!Array.isArray(issueIds)) {
        throw new AppError('Issue IDs must be provided as an array', 400);
      }

      const results = await this.dataIntegrityService.repairIssues(issueIds);
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      throw new AppError('Failed to repair data integrity issues', 500);
    }
  }

  /**
   * Get system performance metrics
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '1h' } = req.query;
      const metrics = await this.monitoringService.getPerformanceMetrics(timeRange as string);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      throw new AppError('Failed to get performance metrics', 500);
    }
  }

  /**
   * Clear system logs older than specified date
   */
  async clearOldLogs(req: Request, res: Response): Promise<void> {
    try {
      const { beforeDate } = req.body;
      
      if (!beforeDate) {
        throw new AppError('Before date is required', 400);
      }

      const result = await this.monitoringService.clearLogsBeforeDate(new Date(beforeDate));
      res.json({
        success: true,
        data: { deletedCount: result }
      });
    } catch (error) {
      throw new AppError('Failed to clear old logs', 500);
    }
  }

  /**
   * Execute database maintenance tasks
   */
  async runDatabaseMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const { tasks } = req.body;
      const results = await this.adminService.runMaintenanceTasks(tasks);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      throw new AppError('Failed to run database maintenance', 500);
    }
  }

  /**
   * Get error analysis and patterns
   */
  async getErrorAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '24h' } = req.query;
      const analysis = await this.monitoringService.getErrorAnalysis(timeRange as string);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      throw new AppError('Failed to get error analysis', 500);
    }
  }

  /**
   * Export system data for backup or analysis
   */
  async exportSystemData(req: Request, res: Response): Promise<void> {
    try {
      const { tables, format = 'json' } = req.body;
      const exportData = await this.adminService.exportData(tables, format);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=system-export-${Date.now()}.${format}`);
      res.send(exportData);
    } catch (error) {
      throw new AppError('Failed to export system data', 500);
    }
  }
}