import { DataIntegrityService } from '../../services/DataIntegrityService';
import { UserRepository } from '../../models/UserRepository';
import { ContentRepository } from '../../models/ContentRepository';
import { DocumentRepository } from '../../models/DocumentRepository';
import { FolderRepository } from '../../models/FolderRepository';
import { TemplateRepository } from '../../models/TemplateRepository';
import { db } from '../../utils/database';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('../../models/UserRepository');
jest.mock('../../models/ContentRepository');
jest.mock('../../models/DocumentRepository');
jest.mock('../../models/FolderRepository');
jest.mock('../../models/TemplateRepository');
jest.mock('../../utils/database', () => ({
  db: {
    query: jest.fn()
  }
}));
jest.mock('fs/promises');
jest.mock('path');

describe('DataIntegrityService', () => {
  let dataIntegrityService: DataIntegrityService;
  let mockDb: any;
  let mockDocumentRepo: jest.Mocked<DocumentRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    dataIntegrityService = new DataIntegrityService();
    
    mockDb = db as jest.Mocked<typeof db>;
    
    mockDocumentRepo = DocumentRepository.prototype as jest.Mocked<DocumentRepository>;
    
    // Mock path operations
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });

  describe('runIntegrityCheck', () => {
    it('should run comprehensive integrity check', async () => {
      // Mock orphaned content
      const mockOrphanedContent = [
        { id: 'content1', title: 'Orphaned Content', author_id: 'missing-user' }
      ];
      
      // Mock orphaned documents
      const mockOrphanedDocuments = [
        { id: 'doc1', filename: 'test.pdf', folder_id: 'missing-folder' }
      ];
      
      // Mock orphaned folders
      const mockOrphanedFolders = [
        { id: 'folder1', name: 'Orphaned Folder', parent_id: 'missing-parent' }
      ];
      
      // Mock content without templates
      const mockContentWithoutTemplates = [
        { id: 'content2', title: 'No Template', template_id: 'missing-template' }
      ];
      
      // Mock invalid emails
      const mockInvalidEmails = [
        { id: 'user1', username: 'testuser', email: 'invalid-email' }
      ];
      
      // Mock invalid status
      const mockInvalidStatus = [
        { id: 'content3', title: 'Invalid Status', status: 'invalid' }
      ];
      
      // Mock invalid document sizes
      const mockInvalidSizes = [
        { id: 'doc2', filename: 'zero-size.pdf', size: 0 }
      ];
      
      // Mock duplicate usernames
      const mockDuplicateUsernames = [
        { username: 'duplicate', count: 2 }
      ];
      
      // Mock duplicate emails
      const mockDuplicateEmails = [
        { email: 'duplicate@test.com', count: 2 }
      ];
      
      // Mock users for duplicates
      const mockDuplicateUsers = [
        { id: 'user1' }, { id: 'user2' }
      ];

      mockDb.query
        // Orphaned records checks
        .mockResolvedValueOnce(mockOrphanedContent)
        .mockResolvedValueOnce(mockOrphanedDocuments)
        .mockResolvedValueOnce(mockOrphanedFolders)
        // Missing references checks
        .mockResolvedValueOnce(mockContentWithoutTemplates)
        // Invalid data checks
        .mockResolvedValueOnce(mockInvalidEmails)
        .mockResolvedValueOnce(mockInvalidStatus)
        .mockResolvedValueOnce(mockInvalidSizes)
        // Constraint violation checks
        .mockResolvedValueOnce(mockDuplicateUsernames)
        .mockResolvedValueOnce(mockDuplicateUsers)
        .mockResolvedValueOnce(mockDuplicateEmails)
        .mockResolvedValueOnce(mockDuplicateUsers);

      // Mock document repository for file mismatch checks
      mockDocumentRepo.findAll.mockResolvedValue([
        {
          id: 'doc3',
          filename: 'existing.pdf',
          size: 1024,
          originalName: 'existing.pdf',
          mimeType: 'application/pdf',
          folderId: 'folder1',
          uploadedBy: 'user1',
          createdAt: new Date(),
          metadata: {}
        }
      ] as any);

      // Mock file stats
      (fs.stat as jest.Mock).mockResolvedValue({ size: 2048 });

      const result = await dataIntegrityService.runIntegrityCheck();

      expect(result.totalIssues).toBeGreaterThan(0);
      expect(result.issuesBySeverity).toBeDefined();
      expect(result.issuesByType).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.checkDuration).toBeGreaterThan(0);
      expect(result.lastCheck).toBeInstanceOf(Date);

      // Verify specific issues are detected
      const issueTypes = result.issues.map(issue => issue.type);
      expect(issueTypes).toContain('orphaned_record');
      expect(issueTypes).toContain('missing_reference');
      expect(issueTypes).toContain('invalid_data');
      expect(issueTypes).toContain('file_mismatch');
      expect(issueTypes).toContain('constraint_violation');
    });

    it('should handle empty results gracefully', async () => {
      // Mock all queries to return empty results
      mockDb.query.mockResolvedValue([]);
      mockDocumentRepo.findAll.mockResolvedValue([]);

      const result = await dataIntegrityService.runIntegrityCheck();

      expect(result.totalIssues).toBe(0);
      expect(result.issues).toEqual([]);
      expect(result.issuesBySeverity).toEqual({});
      expect(result.issuesByType).toEqual({});
    });

    it('should categorize issues correctly', async () => {
      const mockOrphanedContent = [
        { id: 'content1', title: 'Test', author_id: 'missing' }
      ];
      
      const mockInvalidEmails = [
        { id: 'user1', username: 'test', email: 'invalid' }
      ];

      mockDb.query
        .mockResolvedValueOnce(mockOrphanedContent)
        .mockResolvedValueOnce([]) // orphaned documents
        .mockResolvedValueOnce([]) // orphaned folders
        .mockResolvedValueOnce([]) // content without templates
        .mockResolvedValueOnce(mockInvalidEmails)
        .mockResolvedValueOnce([]) // invalid status
        .mockResolvedValueOnce([]) // invalid sizes
        .mockResolvedValueOnce([]) // duplicate usernames
        .mockResolvedValueOnce([]) // duplicate emails

      mockDocumentRepo.findAll.mockResolvedValue([]);

      const result = await dataIntegrityService.runIntegrityCheck();

      expect(result.totalIssues).toBe(2);
      expect(result.issuesBySeverity.medium).toBe(2);
      expect(result.issuesByType.orphaned_record).toBe(1);
      expect(result.issuesByType.invalid_data).toBe(1);
    });
  });

  describe('repairIssues', () => {
    it('should repair orphaned content by assigning to admin', async () => {
      const mockAdmin = [{ id: 'admin1' }];
      mockDb.query
        .mockResolvedValueOnce(mockAdmin) // Find admin
        .mockResolvedValueOnce(undefined); // Update content

      const result = await dataIntegrityService.repairIssues(['orphaned_content_content1']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        issueId: 'orphaned_content_content1',
        success: true,
        message: 'Assigned content to system administrator',
        affectedRecords: 1
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE content SET author_id = ? WHERE id = ?',
        ['admin1', 'content1']
      );
    });

    it('should handle orphaned content when no admin exists', async () => {
      mockDb.query.mockResolvedValueOnce([]); // No admin found

      const result = await dataIntegrityService.repairIssues(['orphaned_content_content1']);

      expect(result[0]).toEqual({
        issueId: 'orphaned_content_content1',
        success: false,
        message: 'No administrator found to assign content to'
      });
    });

    it('should repair orphaned documents by moving to root folder', async () => {
      const mockRootFolder = [{ id: 'root1' }];
      mockDb.query
        .mockResolvedValueOnce(mockRootFolder) // Find root folder
        .mockResolvedValueOnce(undefined); // Update document

      const result = await dataIntegrityService.repairIssues(['orphaned_document_doc1']);

      expect(result[0]).toEqual({
        issueId: 'orphaned_document_doc1',
        success: true,
        message: 'Moved document to root folder',
        affectedRecords: 1
      });
    });

    it('should create root folder if none exists for orphaned documents', async () => {
      mockDb.query
        .mockResolvedValueOnce([]) // No root folder found
        .mockResolvedValueOnce(undefined) // Create root folder
        .mockResolvedValueOnce(undefined); // Update document

      const result = await dataIntegrityService.repairIssues(['orphaned_document_doc1']);

      expect(result[0].success).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO folders (id, name, parent_id, is_public, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        expect.arrayContaining([expect.stringMatching(/^folder_\d+$/), 'Root', null, false, 'system', expect.any(Date), expect.any(Date)])
      );
    });

    it('should repair orphaned folders by making them root folders', async () => {
      mockDb.query.mockResolvedValueOnce(undefined);

      const result = await dataIntegrityService.repairIssues(['orphaned_folder_folder1']);

      expect(result[0]).toEqual({
        issueId: 'orphaned_folder_folder1',
        success: true,
        message: 'Converted folder to root folder',
        affectedRecords: 1
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE folders SET parent_id = NULL WHERE id = ?',
        ['folder1']
      );
    });

    it('should repair invalid content status', async () => {
      mockDb.query.mockResolvedValueOnce(undefined);

      const result = await dataIntegrityService.repairIssues(['invalid_status_content1']);

      expect(result[0]).toEqual({
        issueId: 'invalid_status_content1',
        success: true,
        message: 'Reset content status to draft',
        affectedRecords: 1
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE content SET status = "draft" WHERE id = ?',
        ['content1']
      );
    });

    it('should repair file size mismatches', async () => {
      const mockDocument = {
        id: 'doc1',
        filename: 'test.pdf',
        size: 1024
      };

      mockDocumentRepo.findById.mockResolvedValue(mockDocument as any);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 2048 });
      mockDb.query.mockResolvedValueOnce(undefined);

      const result = await dataIntegrityService.repairIssues(['size_mismatch_doc1']);

      expect(result[0]).toEqual({
        issueId: 'size_mismatch_doc1',
        success: true,
        message: 'Updated document size to match file',
        affectedRecords: 1
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE documents SET size = ? WHERE id = ?',
        [2048, 'doc1']
      );
    });

    it('should handle file access errors during size mismatch repair', async () => {
      const mockDocument = {
        id: 'doc1',
        filename: 'test.pdf',
        size: 1024
      };

      mockDocumentRepo.findById.mockResolvedValue(mockDocument as any);
      (fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await dataIntegrityService.repairIssues(['size_mismatch_doc1']);

      expect(result[0]).toEqual({
        issueId: 'size_mismatch_doc1',
        success: false,
        message: 'Could not access file to verify size'
      });
    });

    it('should handle unknown issue types', async () => {
      const result = await dataIntegrityService.repairIssues(['unknown_issue_type']);

      expect(result[0]).toEqual({
        issueId: 'unknown_issue_type',
        success: false,
        message: 'Unknown issue type or repair strategy not implemented'
      });
    });

    it('should handle repair errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const result = await dataIntegrityService.repairIssues(['orphaned_content_content1']);

      expect(result[0]).toEqual({
        issueId: 'orphaned_content_content1',
        success: false,
        message: 'Failed to repair issue: Database error'
      });
    });

    it('should repair multiple issues', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ id: 'admin1' }]) // For orphaned content
        .mockResolvedValueOnce(undefined) // Update content
        .mockResolvedValueOnce(undefined); // Update folder

      const result = await dataIntegrityService.repairIssues([
        'orphaned_content_content1',
        'orphaned_folder_folder1'
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
    });
  });

  describe('file mismatch detection', () => {
    it('should detect missing files', async () => {
      const mockDocuments = [
        {
          id: 'doc1',
          filename: 'missing.pdf',
          size: 1024,
          originalName: 'missing.pdf',
          mimeType: 'application/pdf',
          folderId: 'folder1',
          uploadedBy: 'user1',
          createdAt: new Date(),
          metadata: {}
        }
      ];

      mockDocumentRepo.findAll.mockResolvedValue(mockDocuments as any);
      (fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

      // Mock other checks to return empty results
      mockDb.query.mockResolvedValue([]);

      const result = await dataIntegrityService.runIntegrityCheck();

      const missingFileIssue = result.issues.find(issue => issue.id === 'missing_file_doc1');
      expect(missingFileIssue).toBeDefined();
      expect(missingFileIssue?.type).toBe('file_mismatch');
      expect(missingFileIssue?.severity).toBe('critical');
      expect(missingFileIssue?.description).toContain('Physical file missing');
    });

    it('should detect file size mismatches', async () => {
      const mockDocuments = [
        {
          id: 'doc1',
          filename: 'mismatch.pdf',
          size: 1024,
          originalName: 'mismatch.pdf',
          mimeType: 'application/pdf',
          folderId: 'folder1',
          uploadedBy: 'user1',
          createdAt: new Date(),
          metadata: {}
        }
      ];

      mockDocumentRepo.findAll.mockResolvedValue(mockDocuments as any);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 2048 });

      // Mock other checks to return empty results
      mockDb.query.mockResolvedValue([]);

      const result = await dataIntegrityService.runIntegrityCheck();

      const sizeMismatchIssue = result.issues.find(issue => issue.id === 'size_mismatch_doc1');
      expect(sizeMismatchIssue).toBeDefined();
      expect(sizeMismatchIssue?.type).toBe('file_mismatch');
      expect(sizeMismatchIssue?.severity).toBe('high');
      expect(sizeMismatchIssue?.details).toEqual({
        dbSize: 1024,
        fileSize: 2048
      });
    });
  });
});