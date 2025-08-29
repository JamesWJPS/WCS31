import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface FileStorageConfig {
  uploadDir: string;
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  thumbnailDir?: string;
  tempDir?: string;
}

export interface DocumentStorageStructure {
  documents: string;
  thumbnails: string;
  temp: string;
  folders: {
    [folderId: string]: string;
  };
}

export interface StoredFile {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  hash: string;
}

export class FileStorage {
  private config: FileStorageConfig;
  private storageStructure: DocumentStorageStructure;

  constructor(config: FileStorageConfig) {
    this.config = config;
    this.storageStructure = this.initializeStorageStructure();
    this.ensureDirectoryStructure();
  }

  /**
   * Initialize the document storage directory structure
   */
  private initializeStorageStructure(): DocumentStorageStructure {
    const baseDir = this.config.uploadDir;
    return {
      documents: path.join(baseDir, 'documents'),
      thumbnails: path.join(baseDir, 'thumbnails'),
      temp: path.join(baseDir, 'temp'),
      folders: {}
    };
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectoryStructure(): void {
    const directories = [
      this.config.uploadDir,
      this.storageStructure.documents,
      this.storageStructure.thumbnails,
      this.storageStructure.temp
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Create folder-specific directory structure
   */
  createFolderDirectory(folderId: string): string {
    const folderPath = path.join(this.storageStructure.documents, folderId);
    
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    this.storageStructure.folders[folderId] = folderPath;
    return folderPath;
  }

  /**
   * Get folder directory path
   */
  getFolderDirectory(folderId: string): string {
    if (!this.storageStructure.folders[folderId]) {
      return this.createFolderDirectory(folderId);
    }
    return this.storageStructure.folders[folderId];
  }

  /**
   * Remove folder directory and all its contents
   */
  removeFolderDirectory(folderId: string): void {
    const folderPath = this.storageStructure.folders[folderId];
    
    if (folderPath && fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      delete this.storageStructure.folders[folderId];
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(file: Express.Multer.File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
      };
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `File type ${file.mimetype} is not allowed`
      };
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `File extension ${extension} is not allowed`
      };
    }

    return { isValid: true };
  }

  /**
   * Generate a secure filename
   */
  private generateSecureFilename(originalName: string): string {
    const extension = path.extname(originalName);
    const uuid = uuidv4();
    return `${uuid}${extension}`;
  }

  /**
   * Calculate file hash for integrity checking
   */
  private calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Store uploaded file securely in folder-specific directory
   */
  async storeFile(file: Express.Multer.File, folderId?: string): Promise<StoredFile> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Generate secure filename
    const secureFilename = this.generateSecureFilename(file.originalname);
    
    // Determine storage location
    let storageDir: string;
    if (folderId) {
      storageDir = this.getFolderDirectory(folderId);
    } else {
      storageDir = this.storageStructure.documents;
    }
    
    const filePath = path.join(storageDir, secureFilename);

    // Store file
    fs.writeFileSync(filePath, file.buffer);

    // Calculate file hash
    const hash = this.calculateFileHash(filePath);

    return {
      filename: secureFilename,
      originalName: file.originalname,
      path: filePath,
      size: file.size,
      mimeType: file.mimetype,
      hash
    };
  }

  /**
   * Store file in temporary directory for processing
   */
  async storeTempFile(file: Express.Multer.File): Promise<StoredFile> {
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const secureFilename = this.generateSecureFilename(file.originalname);
    const filePath = path.join(this.storageStructure.temp, secureFilename);

    fs.writeFileSync(filePath, file.buffer);
    const hash = this.calculateFileHash(filePath);

    return {
      filename: secureFilename,
      originalName: file.originalname,
      path: filePath,
      size: file.size,
      mimeType: file.mimetype,
      hash
    };
  }

  /**
   * Move file from temporary to permanent storage
   */
  async moveTempToPermanent(tempFilename: string, folderId?: string): Promise<string> {
    const tempPath = path.join(this.storageStructure.temp, tempFilename);
    
    if (!fs.existsSync(tempPath)) {
      throw new Error('Temporary file not found');
    }

    const storageDir = folderId ? this.getFolderDirectory(folderId) : this.storageStructure.documents;
    const permanentPath = path.join(storageDir, tempFilename);

    fs.renameSync(tempPath, permanentPath);
    return permanentPath;
  }

  /**
   * Delete a stored file from folder-specific directory
   */
  async deleteFile(filename: string, folderId?: string): Promise<void> {
    let filePath: string;
    
    if (folderId) {
      const folderDir = this.getFolderDirectory(folderId);
      filePath = path.join(folderDir, filename);
    } else {
      filePath = path.join(this.storageStructure.documents, filename);
    }
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Also try to delete thumbnail if it exists
    const thumbnailPath = path.join(this.storageStructure.thumbnails, filename);
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
  }

  /**
   * Delete temporary file
   */
  async deleteTempFile(filename: string): Promise<void> {
    const filePath = path.join(this.storageStructure.temp, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTempFiles(maxAgeHours: number = 24): Promise<void> {
    const tempDir = this.storageStructure.temp;
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();

    if (!fs.existsSync(tempDir)) {
      return;
    }

    const files = fs.readdirSync(tempDir);
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Check if file exists in folder-specific directory
   */
  fileExists(filename: string, folderId?: string): boolean {
    let filePath: string;
    
    if (folderId) {
      const folderDir = this.getFolderDirectory(folderId);
      filePath = path.join(folderDir, filename);
    } else {
      filePath = path.join(this.storageStructure.documents, filename);
    }
    
    return fs.existsSync(filePath);
  }

  /**
   * Get file path for serving
   */
  getFilePath(filename: string, folderId?: string): string {
    if (folderId) {
      const folderDir = this.getFolderDirectory(folderId);
      return path.join(folderDir, filename);
    }
    return path.join(this.storageStructure.documents, filename);
  }

  /**
   * Get file stats
   */
  getFileStats(filename: string, folderId?: string): fs.Stats | null {
    const filePath = this.getFilePath(filename, folderId);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    return fs.statSync(filePath);
  }

  /**
   * Get storage structure information
   */
  getStorageInfo(): {
    totalSize: number;
    fileCount: number;
    folderCount: number;
    directories: DocumentStorageStructure;
  } {
    let totalSize = 0;
    let fileCount = 0;
    let folderCount = Object.keys(this.storageStructure.folders).length;

    const calculateDirSize = (dirPath: string): void => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
          fileCount++;
        } else if (stats.isDirectory()) {
          calculateDirSize(filePath);
        }
      }
    };

    calculateDirSize(this.storageStructure.documents);
    calculateDirSize(this.storageStructure.thumbnails);

    return {
      totalSize,
      fileCount,
      folderCount,
      directories: this.storageStructure
    };
  }

  /**
   * Verify file integrity
   */
  verifyFileIntegrity(filename: string, expectedHash: string, folderId?: string): boolean {
    const filePath = this.getFilePath(filename, folderId);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const actualHash = this.calculateFileHash(filePath);
    return actualHash === expectedHash;
  }

  /**
   * List files in a folder directory
   */
  listFolderFiles(folderId: string): Array<{
    filename: string;
    size: number;
    mtime: Date;
    isDirectory: boolean;
  }> {
    const folderDir = this.getFolderDirectory(folderId);
    
    if (!fs.existsSync(folderDir)) {
      return [];
    }

    const files = fs.readdirSync(folderDir);
    
    return files.map(filename => {
      const filePath = path.join(folderDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory()
      };
    });
  }

  /**
   * Get available disk space
   */
  getAvailableSpace(): { free: number; total: number } {
    try {
      const stats = fs.statSync(this.config.uploadDir);
      // This is a simplified version - in production you might want to use a library like 'statvfs'
      return {
        free: 1024 * 1024 * 1024, // 1GB placeholder
        total: 10 * 1024 * 1024 * 1024 // 10GB placeholder
      };
    } catch (error) {
      return { free: 0, total: 0 };
    }
  }
}

// Default configuration
export const defaultFileStorageConfig: FileStorageConfig = {
  uploadDir: path.join(process.cwd(), 'data', 'uploads'),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ],
  allowedExtensions: [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    // Archives
    '.zip', '.rar', '.7z'
  ]
};