import { db } from '../utils/database';
import { UserRepository } from '../models/UserRepository';
import { ContentRepository } from '../models/ContentRepository';
import { DocumentRepository } from '../models/DocumentRepository';
import { FolderRepository } from '../models/FolderRepository';
import { TemplateRepository } from '../models/TemplateRepository';
import fs from 'fs/promises';
import path from 'path';

export interface IntegrityIssue {
  id: string;
  type: 'orphaned_record' | 'missing_reference' | 'invalid_data' | 'file_mismatch' | 'constraint_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  table: string;
  recordId: string;
  description: string;
  details: Record<string, any>;
  autoRepairable: boolean;
  detectedAt: Date;
}

export interface IntegrityCheckResult {
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  issuesByType: Record<string, number>;
  issues: IntegrityIssue[];
  checkDuration: number;
  lastCheck: Date;
}

export interface RepairResult {
  issueId: string;
  success: boolean;
  message: string;
  affectedRecords?: number;
}

export class DataIntegrityService {
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
  }

  /**
   * Run comprehensive data integrity check
   */
  async runIntegrityCheck(): Promise<IntegrityCheckResult> {
    const startTime = Date.now();
    const issues: IntegrityIssue[] = [];

    // Run all integrity checks
    const checks = [
      this.checkOrphanedRecords(),
      this.checkMissingReferences(),
      this.checkInvalidData(),
      this.checkFileMismatches(),
      this.checkConstraintViolations()
    ];

    const checkResults = await Promise.all(checks);
    checkResults.forEach(result => issues.push(...result));

    const checkDuration = Date.now() - startTime;

    // Categorize issues
    const issuesBySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalIssues: issues.length,
      issuesBySeverity,
      issuesByType,
      issues,
      checkDuration,
      lastCheck: new Date()
    };
  }

  /**
   * Repair specific integrity issues
   */
  async repairIssues(issueIds: string[]): Promise<RepairResult[]> {
    const results: RepairResult[] = [];

    for (const issueId of issueIds) {
      try {
        const result = await this.repairSingleIssue(issueId);
        results.push(result);
      } catch (error) {
        results.push({
          issueId,
          success: false,
          message: `Failed to repair issue: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return results;
  }

  // Private integrity check methods
  private async checkOrphanedRecords(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    // Check for content without valid authors
    const orphanedContent = await db.query(`
      SELECT c.id, c.title, c.author_id 
      FROM content c 
      LEFT JOIN users u ON c.author_id = u.id 
      WHERE u.id IS NULL
    `);

    for (const content of orphanedContent) {
      issues.push({
        id: `orphaned_content_${content.id}`,
        type: 'orphaned_record',
        severity: 'medium',
        table: 'content',
        recordId: content.id,
        description: `Content "${content.title}" has invalid author reference`,
        details: { authorId: content.author_id },
        autoRepairable: true,
        detectedAt: new Date()
      });
    }

    // Check for documents without valid folders
    const orphanedDocuments = await db.query(`
      SELECT d.id, d.filename, d.folder_id 
      FROM documents d 
      LEFT JOIN folders f ON d.folder_id = f.id 
      WHERE f.id IS NULL
    `);

    for (const document of orphanedDocuments) {
      issues.push({
        id: `orphaned_document_${document.id}`,
        type: 'orphaned_record',
        severity: 'high',
        table: 'documents',
        recordId: document.id,
        description: `Document "${document.filename}" references non-existent folder`,
        details: { folderId: document.folder_id },
        autoRepairable: true,
        detectedAt: new Date()
      });
    }

    // Check for folders with invalid parent references
    const orphanedFolders = await db.query(`
      SELECT f1.id, f1.name, f1.parent_id 
      FROM folders f1 
      LEFT JOIN folders f2 ON f1.parent_id = f2.id 
      WHERE f1.parent_id IS NOT NULL AND f2.id IS NULL
    `);

    for (const folder of orphanedFolders) {
      issues.push({
        id: `orphaned_folder_${folder.id}`,
        type: 'orphaned_record',
        severity: 'medium',
        table: 'folders',
        recordId: folder.id,
        description: `Folder "${folder.name}" has invalid parent reference`,
        details: { parentId: folder.parent_id },
        autoRepairable: true,
        detectedAt: new Date()
      });
    }

    return issues;
  }

  private async checkMissingReferences(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    // Check for content without templates
    const contentWithoutTemplates = await db.query(`
      SELECT c.id, c.title, c.template_id 
      FROM content c 
      LEFT JOIN templates t ON c.template_id = t.id 
      WHERE t.id IS NULL
    `);

    for (const content of contentWithoutTemplates) {
      issues.push({
        id: `missing_template_${content.id}`,
        type: 'missing_reference',
        severity: 'high',
        table: 'content',
        recordId: content.id,
        description: `Content "${content.title}" references non-existent template`,
        details: { templateId: content.template_id },
        autoRepairable: false,
        detectedAt: new Date()
      });
    }

    return issues;
  }

  private async checkInvalidData(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    // Check for users with invalid email formats
    const invalidEmails = await db.query(`
      SELECT id, username, email 
      FROM users 
      WHERE email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
    `);

    for (const user of invalidEmails) {
      issues.push({
        id: `invalid_email_${user.id}`,
        type: 'invalid_data',
        severity: 'medium',
        table: 'users',
        recordId: user.id,
        description: `User "${user.username}" has invalid email format`,
        details: { email: user.email },
        autoRepairable: false,
        detectedAt: new Date()
      });
    }

    // Check for content with invalid status
    const invalidStatus = await db.query(`
      SELECT id, title, status 
      FROM content 
      WHERE status NOT IN ('draft', 'published', 'archived')
    `);

    for (const content of invalidStatus) {
      issues.push({
        id: `invalid_status_${content.id}`,
        type: 'invalid_data',
        severity: 'low',
        table: 'content',
        recordId: content.id,
        description: `Content "${content.title}" has invalid status`,
        details: { status: content.status },
        autoRepairable: true,
        detectedAt: new Date()
      });
    }

    // Check for documents with zero or negative size
    const invalidDocumentSizes = await db.query(`
      SELECT id, filename, size 
      FROM documents 
      WHERE size <= 0
    `);

    for (const document of invalidDocumentSizes) {
      issues.push({
        id: `invalid_size_${document.id}`,
        type: 'invalid_data',
        severity: 'medium',
        table: 'documents',
        recordId: document.id,
        description: `Document "${document.filename}" has invalid size`,
        details: { size: document.size },
        autoRepairable: false,
        detectedAt: new Date()
      });
    }

    return issues;
  }

  private async checkFileMismatches(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];
    const documents = await this.documentRepo.findAll();

    for (const document of documents) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', document.filename);
        const stats = await fs.stat(filePath);
        
        // Check if file size matches database record
        if (stats.size !== document.size) {
          issues.push({
            id: `size_mismatch_${document.id}`,
            type: 'file_mismatch',
            severity: 'high',
            table: 'documents',
            recordId: document.id,
            description: `File size mismatch for "${document.filename}"`,
            details: { 
              dbSize: document.size, 
              fileSize: stats.size 
            },
            autoRepairable: true,
            detectedAt: new Date()
          });
        }
      } catch (error) {
        // File doesn't exist
        issues.push({
          id: `missing_file_${document.id}`,
          type: 'file_mismatch',
          severity: 'critical',
          table: 'documents',
          recordId: document.id,
          description: `Physical file missing for "${document.filename}"`,
          details: { filename: document.filename },
          autoRepairable: false,
          detectedAt: new Date()
        });
      }
    }

    return issues;
  }

  private async checkConstraintViolations(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    // Check for duplicate usernames
    const duplicateUsernames = await db.query(`
      SELECT username, COUNT(*) as count 
      FROM users 
      GROUP BY username 
      HAVING count > 1
    `);

    for (const duplicate of duplicateUsernames) {
      const users = await db.query('SELECT id FROM users WHERE username = ?', [duplicate.username]);
      
      issues.push({
        id: `duplicate_username_${duplicate.username}`,
        type: 'constraint_violation',
        severity: 'high',
        table: 'users',
        recordId: users.map((u: any) => u.id).join(','),
        description: `Duplicate username "${duplicate.username}" found`,
        details: { count: duplicate.count, userIds: users.map((u: any) => u.id) },
        autoRepairable: false,
        detectedAt: new Date()
      });
    }

    // Check for duplicate email addresses
    const duplicateEmails = await db.query(`
      SELECT email, COUNT(*) as count 
      FROM users 
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email 
      HAVING count > 1
    `);

    for (const duplicate of duplicateEmails) {
      const users = await db.query('SELECT id FROM users WHERE email = ?', [duplicate.email]);
      
      issues.push({
        id: `duplicate_email_${duplicate.email}`,
        type: 'constraint_violation',
        severity: 'high',
        table: 'users',
        recordId: users.map((u: any) => u.id).join(','),
        description: `Duplicate email "${duplicate.email}" found`,
        details: { count: duplicate.count, userIds: users.map((u: any) => u.id) },
        autoRepairable: false,
        detectedAt: new Date()
      });
    }

    return issues;
  }

  private async repairSingleIssue(issueId: string): Promise<RepairResult> {

    // Parse issue ID to determine repair strategy
    if (issueId.startsWith('orphaned_content_')) {
      const contentId = issueId.replace('orphaned_content_', '');
      
      // Set author to system admin or first available admin
      const [admin] = await db.query('SELECT id FROM users WHERE role = "administrator" LIMIT 1');
      
      if (admin) {
        await db.query('UPDATE content SET author_id = ? WHERE id = ?', [admin.id, contentId]);
        return {
          issueId,
          success: true,
          message: 'Assigned content to system administrator',
          affectedRecords: 1
        };
      } else {
        return {
          issueId,
          success: false,
          message: 'No administrator found to assign content to'
        };
      }
    }

    if (issueId.startsWith('orphaned_document_')) {
      const documentId = issueId.replace('orphaned_document_', '');
      
      // Create a default folder or assign to root folder
      let [rootFolder] = await db.query('SELECT id FROM folders WHERE parent_id IS NULL LIMIT 1');
      
      if (!rootFolder) {
        // Create root folder
        const rootFolderId = `folder_${Date.now()}`;
        await db.query(
          'INSERT INTO folders (id, name, parent_id, is_public, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [rootFolderId, 'Root', null, false, 'system', new Date(), new Date()]
        );
        rootFolder = { id: rootFolderId };
      }

      await db.query('UPDATE documents SET folder_id = ? WHERE id = ?', [rootFolder.id, documentId]);
      return {
        issueId,
        success: true,
        message: 'Moved document to root folder',
        affectedRecords: 1
      };
    }

    if (issueId.startsWith('orphaned_folder_')) {
      const folderId = issueId.replace('orphaned_folder_', '');
      
      // Set parent to null (make it a root folder)
      await db.query('UPDATE folders SET parent_id = NULL WHERE id = ?', [folderId]);
      return {
        issueId,
        success: true,
        message: 'Converted folder to root folder',
        affectedRecords: 1
      };
    }

    if (issueId.startsWith('invalid_status_')) {
      const contentId = issueId.replace('invalid_status_', '');
      
      // Set status to draft
      await db.query('UPDATE content SET status = "draft" WHERE id = ?', [contentId]);
      return {
        issueId,
        success: true,
        message: 'Reset content status to draft',
        affectedRecords: 1
      };
    }

    if (issueId.startsWith('size_mismatch_')) {
      const documentId = issueId.replace('size_mismatch_', '');
      const document = await this.documentRepo.findById(documentId);
      
      if (document) {
        try {
          const filePath = path.join(process.cwd(), 'uploads', document.filename);
          const stats = await fs.stat(filePath);
          
          // Update database with actual file size
          await db.query('UPDATE documents SET size = ? WHERE id = ?', [stats.size, documentId]);
          return {
            issueId,
            success: true,
            message: 'Updated document size to match file',
            affectedRecords: 1
          };
        } catch (error) {
          return {
            issueId,
            success: false,
            message: 'Could not access file to verify size'
          };
        }
      }
    }

    return {
      issueId,
      success: false,
      message: 'Unknown issue type or repair strategy not implemented'
    };
  }
}