import fs from 'fs';
import path from 'path';
import { FileStorage, defaultFileStorageConfig } from '../../utils/fileStorage';

// Mock fs, crypto, and uuid modules
jest.mock('fs');
jest.mock('crypto');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234-5678-9012-abcdef123456')
}));
const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileStorage', () => {
  let fileStorage: FileStorage;
  const testConfig = {
    ...defaultFileStorageConfig,
    uploadDir: '/test/uploads'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs methods before creating FileStorage instance
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation();
    mockFs.writeFileSync.mockImplementation();
    mockFs.unlinkSync.mockImplementation();
    mockFs.readFileSync.mockReturnValue(Buffer.from('test file content'));
    mockFs.statSync.mockReturnValue({
      size: 1024,
      isFile: () => true,
      isDirectory: () => false
    } as fs.Stats);
    
    // Mock crypto
    const crypto = require('crypto');
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash')
    };
    crypto.createHash = jest.fn().mockReturnValue(mockHash);
    
    fileStorage = new FileStorage(testConfig);
  });

  describe('constructor', () => {
    it('should create upload directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      new FileStorage(testConfig);
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/uploads', { recursive: true });
    });

    it('should not create upload directory if it already exists', () => {
      // Clear previous mocks and set up for this specific test
      jest.clearAllMocks();
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock crypto again since we cleared mocks
      const crypto = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mocked-hash')
      };
      crypto.createHash = jest.fn().mockReturnValue(mockHash);
      
      new FileStorage(testConfig);
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('validateFile', () => {
    const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
      ...overrides
    });

    it('should validate a valid file', () => {
      const file = createMockFile();
      
      const result = fileStorage.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file that exceeds size limit', () => {
      const file = createMockFile({
        size: testConfig.maxFileSize + 1
      });
      
      const result = fileStorage.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size exceeds maximum');
    });

    it('should reject file with invalid MIME type', () => {
      const file = createMockFile({
        mimetype: 'application/x-malware'
      });
      
      const result = fileStorage.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type application/x-malware is not allowed');
    });

    it('should reject file with invalid extension', () => {
      const file = createMockFile({
        originalname: 'test.exe',
        mimetype: 'application/pdf' // Valid MIME but invalid extension
      });
      
      const result = fileStorage.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File extension .exe is not allowed');
    });

    it('should handle files without extensions', () => {
      const file = createMockFile({
        originalname: 'test',
        mimetype: 'application/pdf'
      });
      
      const result = fileStorage.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File extension  is not allowed');
    });
  });

  describe('storeFile', () => {
    const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test content'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
      ...overrides
    });

    it('should store a valid file successfully', async () => {
      const file = createMockFile();
      
      const result = await fileStorage.storeFile(file);
      
      expect(result.originalName).toBe('test.pdf');
      expect(result.size).toBe(1024);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toBe('mocked-uuid-1234-5678-9012-abcdef123456.pdf');
      expect(result.hash).toBeDefined();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should throw error for invalid file', async () => {
      const file = createMockFile({
        size: testConfig.maxFileSize + 1
      });
      
      await expect(fileStorage.storeFile(file)).rejects.toThrow('File size exceeds maximum');
    });

    it('should generate unique filenames for files with same original name', async () => {
      const { v4: uuidv4 } = require('uuid');
      uuidv4
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');
      
      const file1 = createMockFile();
      const file2 = createMockFile();
      
      const result1 = await fileStorage.storeFile(file1);
      const result2 = await fileStorage.storeFile(file2);
      
      expect(result1.filename).toBe('uuid-1.pdf');
      expect(result2.filename).toBe('uuid-2.pdf');
      expect(result1.filename).not.toBe(result2.filename);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      mockFs.existsSync.mockReturnValue(true);
      
      await fileStorage.deleteFile('test-file.pdf');
      
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(path.join('/test/uploads', 'test-file.pdf'));
    });

    it('should not throw error when deleting non-existent file', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(fileStorage.deleteFile('non-existent.pdf')).resolves.not.toThrow();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      const exists = fileStorage.fileExists('test-file.pdf');
      
      expect(exists).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith(path.join('/test/uploads', 'test-file.pdf'));
    });

    it('should return false for non-existent file', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const exists = fileStorage.fileExists('non-existent.pdf');
      
      expect(exists).toBe(false);
    });
  });

  describe('getFilePath', () => {
    it('should return correct file path', () => {
      const filePath = fileStorage.getFilePath('test-file.pdf');
      
      expect(filePath).toBe(path.join('/test/uploads', 'test-file.pdf'));
    });
  });

  describe('getFileStats', () => {
    it('should return file stats for existing file', () => {
      mockFs.existsSync.mockReturnValue(true);
      const mockStats = { size: 1024, isFile: () => true } as fs.Stats;
      mockFs.statSync.mockReturnValue(mockStats);
      
      const stats = fileStorage.getFileStats('test-file.pdf');
      
      expect(stats).toBe(mockStats);
    });

    it('should return null for non-existent file', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const stats = fileStorage.getFileStats('non-existent.pdf');
      
      expect(stats).toBeNull();
    });
  });

  describe('verifyFileIntegrity', () => {
    it('should return true for file with matching hash', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock crypto to return the expected hash
      const crypto = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('expected-hash')
      };
      crypto.createHash = jest.fn().mockReturnValue(mockHash);
      
      const isValid = fileStorage.verifyFileIntegrity('test-file.pdf', 'expected-hash');
      
      expect(isValid).toBe(true);
    });

    it('should return false for non-existent file', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const isValid = fileStorage.verifyFileIntegrity('non-existent.pdf', 'any-hash');
      
      expect(isValid).toBe(false);
    });
  });
});