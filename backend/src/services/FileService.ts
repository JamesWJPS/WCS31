import { v4 as uuidv4 } from 'uuid';
import { DocumentRepository } from '../models/DocumentRepository';
import { FolderRepository } from '../models/FolderRepository';
import { FileStorage, defaultFileStorageConfig, StoredFile } from '../utils/fileStorage';
import { Document } from '../models/interfaces';

export interface FileUploadResult {
  document: Document;
  storedFile: StoredFile;
}

export interface FileAccessResult {
  document: Document;
  filePath: string;
  canAccess: boolean;
}

export class FileService {
  private documentRepository: DocumentRepository;
  private folderRepository: FolderRepository;
  private fileStorage: FileStorage;

  constructor() {
    this.documentRepository = new DocumentRepository();
    this.folderRepository = new FolderRepository();
    this.fileStorage = new FileStorage(defaultFileStorageConfig);
  }

  /**
   * Upload a file to a specific folder
   */
  async uploadFile(
    file: Express.Multer.File,
    folderId: string,
    uploadedBy: string,
    metadata?: { title?: string; description?: string; tags?: string[] }
  ): Promise<FileUploadResult> {
    // Verify folder exists and user has write permission
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Store the file
    const storedFile = await this.fileStorage.storeFile(file);

    // Create document record
    const documentId = uuidv4();
    const documentData = {
      id: documentId,
      filename: storedFile.filename,
      original_name: storedFile.originalName,
      mime_type: storedFile.mimeType,
      size: storedFile.size,
      folder_id: folderId,
      uploaded_by: uploadedBy,
      metadata: JSON.stringify({
        title: metadata?.title || storedFile.originalName,
        description: metadata?.description,
        tags: metadata?.tags || [],
        hash: storedFile.hash
      })
    };

    // Save document to database
    const savedDocument = await this.documentRepository.create(documentData);
    if (!savedDocument) {
      // Clean up stored file if database save fails
      await this.fileStorage.deleteFile(storedFile.filename);
      throw new Error('Failed to save document record');
    }

    return {
      document: savedDocument,
      storedFile
    };
  }

  /**
   * Upload multiple files to a folder
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folderId: string,
    uploadedBy: string,
    metadata?: { title?: string; description?: string; tags?: string[] }
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];
    const uploadedFiles: string[] = [];

    try {
      for (const file of files) {
        const result = await this.uploadFile(file, folderId, uploadedBy, metadata);
        results.push(result);
        uploadedFiles.push(result.storedFile.filename);
      }
      
      return results;
    } catch (error) {
      // Clean up any files that were uploaded before the error
      for (const filename of uploadedFiles) {
        try {
          await this.fileStorage.deleteFile(filename);
          // Also remove from database
          const doc = await this.documentRepository.findAll();
          const docToDelete = doc.find(d => d.filename === filename);
          if (docToDelete) {
            await this.documentRepository.delete(docToDelete.id);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', filename, cleanupError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Check if user can access a file
   */
  async checkFileAccess(
    documentId: string,
    userId: string,
    userRole: string
  ): Promise<FileAccessResult> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Check folder permissions
    const hasReadPermission = await this.folderRepository.hasReadPermission(
      document.folderId,
      userId,
      userRole
    );

    const filePath = this.fileStorage.getFilePath(document.filename);

    return {
      document,
      filePath,
      canAccess: hasReadPermission
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(documentId: string, userId: string, userRole: string): Promise<void> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has write permission to the folder
    const hasWritePermission = await this.folderRepository.hasWritePermission(
      document.folderId,
      userId,
      userRole
    );

    if (!hasWritePermission) {
      throw new Error('Insufficient permissions to delete file');
    }

    // Delete from file system
    await this.fileStorage.deleteFile(document.filename);

    // Delete from database
    await this.documentRepository.delete(documentId);
  }

  /**
   * Get files in a folder that user can access
   */
  async getFilesInFolder(
    folderId: string,
    userId: string,
    userRole: string
  ): Promise<Document[]> {
    // Check if user has read permission to the folder
    const hasReadPermission = await this.folderRepository.hasReadPermission(
      folderId,
      userId,
      userRole
    );

    if (!hasReadPermission) {
      return [];
    }

    return this.documentRepository.findByFolder(folderId);
  }

  /**
   * Search files accessible to user
   */
  async searchFiles(
    searchTerm: string,
    userId: string,
    userRole: string
  ): Promise<Document[]> {
    // Get all accessible documents for the user
    const accessibleDocuments = await this.documentRepository.getDocumentsForUser(
      userId,
      userRole,
      this.folderRepository
    );

    // Filter by search term
    return accessibleDocuments.filter(doc => 
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.metadata.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.metadata.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.metadata.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    documentId: string,
    metadata: { title?: string; description?: string; tags?: string[] },
    userId: string,
    userRole: string
  ): Promise<Document | null> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has write permission to the folder
    const hasWritePermission = await this.folderRepository.hasWritePermission(
      document.folderId,
      userId,
      userRole
    );

    if (!hasWritePermission) {
      throw new Error('Insufficient permissions to update file metadata');
    }

    return this.documentRepository.updateMetadata(documentId, metadata);
  }

  /**
   * Verify file integrity
   */
  async verifyFileIntegrity(documentId: string): Promise<boolean> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      return false;
    }

    const expectedHash = document.metadata.hash;
    if (!expectedHash) {
      return false;
    }

    return this.fileStorage.verifyFileIntegrity(document.filename, expectedHash);
  }

  /**
   * Get file statistics for a folder
   */
  async getFolderFileStats(
    folderId: string,
    userId: string,
    userRole: string
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }> {
    // Check if user has read permission to the folder
    const hasReadPermission = await this.folderRepository.hasReadPermission(
      folderId,
      userId,
      userRole
    );

    if (!hasReadPermission) {
      return {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {}
      };
    }

    const stats = await this.documentRepository.getFolderStats(folderId);
    return {
      totalFiles: stats.totalDocuments,
      totalSize: stats.totalSize,
      fileTypes: stats.mimeTypes
    };
  }

  /**
   * Clean up orphaned files (files in storage but not in database)
   */
  async cleanupOrphanedFiles(): Promise<{ cleaned: string[]; errors: string[] }> {
    // This should only be called by administrators
    const cleaned: string[] = [];
    const errors: string[] = [];

    try {
      const fs = require('fs');
      
      const uploadDir = defaultFileStorageConfig.uploadDir;
      if (!fs.existsSync(uploadDir)) {
        return { cleaned, errors };
      }

      const files = fs.readdirSync(uploadDir);
      const allDocuments = await this.documentRepository.findAll();
      const documentFilenames = new Set(allDocuments.map(doc => doc.filename));

      for (const file of files) {
        if (!documentFilenames.has(file)) {
          try {
            await this.fileStorage.deleteFile(file);
            cleaned.push(file);
          } catch (error) {
            errors.push(`Failed to delete ${file}: ${error}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Error during cleanup: ${error}`);
    }

    return { cleaned, errors };
  }
}