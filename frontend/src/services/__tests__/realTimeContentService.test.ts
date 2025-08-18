import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealTimeContentService, ContentUpdateEvent } from '../realTimeContentService';
import { contentService } from '../contentService';

// Mock the contentService
vi.mock('../contentService');
const mockContentService = contentService as any;

describe('RealTimeContentService', () => {
  let service: RealTimeContentService;
  let mockListener: any;

  beforeEach(() => {
    service = new RealTimeContentService();
    mockListener = vi.fn();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.stopMonitoring();
    vi.useRealTimers();
  });

  describe('monitoring lifecycle', () => {
    it('should start and stop monitoring correctly', () => {
      expect(service.getStatus().isPolling).toBe(false);
      
      service.startMonitoring();
      expect(service.getStatus().isPolling).toBe(true);
      
      service.stopMonitoring();
      expect(service.getStatus().isPolling).toBe(false);
    });

    it('should not start monitoring if already polling', () => {
      service.startMonitoring();
      const firstStatus = service.getStatus();
      
      service.startMonitoring(); // Try to start again
      const secondStatus = service.getStatus();
      
      expect(firstStatus.isPolling).toBe(true);
      expect(secondStatus.isPolling).toBe(true);
    });

    it('should set custom polling interval', () => {
      service.setPollingInterval(2000);
      service.startMonitoring();
      
      // Verify that checkForUpdates is called at the correct interval
      mockContentService.getContentList.mockResolvedValue([]);
      
      vi.advanceTimersByTime(2000);
      expect(mockContentService.getContentList).toHaveBeenCalledTimes(2); // Initial + first interval
      
      vi.advanceTimersByTime(2000);
      expect(mockContentService.getContentList).toHaveBeenCalledTimes(3);
    });
  });

  describe('listener management', () => {
    it('should add and remove listeners correctly', () => {
      expect(service.getStatus().listenerCount).toBe(0);
      
      service.addListener(mockListener);
      expect(service.getStatus().listenerCount).toBe(1);
      
      service.removeListener(mockListener);
      expect(service.getStatus().listenerCount).toBe(0);
    });

    it('should call listeners when events are emitted', () => {
      service.addListener(mockListener);
      
      const event: ContentUpdateEvent = {
        type: 'created',
        contentId: 'test-id',
        content: {
          id: 'test-id',
          title: 'Test Content',
          status: 'published',
          show_in_menu: 1
        },
        timestamp: new Date()
      };
      
      service.optimisticUpdate(event);
      
      expect(mockListener).toHaveBeenCalledWith(event);
    });
  });

  describe('change detection', () => {
    it('should detect created content', async () => {
      const initialContent = [
        { id: '1', title: 'Content 1', status: 'published', show_in_menu: 1 }
      ];
      const updatedContent = [
        { id: '1', title: 'Content 1', status: 'published', show_in_menu: 1 },
        { id: '2', title: 'Content 2', status: 'published', show_in_menu: 1 }
      ];

      mockContentService.getContentList
        .mockResolvedValueOnce(initialContent)
        .mockResolvedValueOnce(updatedContent);

      service.addListener(mockListener);
      service.startMonitoring();

      // First call - establish baseline
      await vi.advanceTimersByTimeAsync(0);
      expect(mockListener).not.toHaveBeenCalled();

      // Second call - detect change
      await vi.advanceTimersByTimeAsync(5000);
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'created',
          contentId: '2',
          content: expect.objectContaining({ id: '2', title: 'Content 2' })
        })
      );
    });

    it('should detect deleted content', async () => {
      const initialContent = [
        { id: '1', title: 'Content 1', status: 'published', show_in_menu: 1 },
        { id: '2', title: 'Content 2', status: 'published', show_in_menu: 1 }
      ];
      const updatedContent = [
        { id: '1', title: 'Content 1', status: 'published', show_in_menu: 1 }
      ];

      mockContentService.getContentList
        .mockResolvedValueOnce(initialContent)
        .mockResolvedValueOnce(updatedContent);

      service.addListener(mockListener);
      service.startMonitoring();

      // First call - establish baseline
      await vi.advanceTimersByTimeAsync(0);
      expect(mockListener).not.toHaveBeenCalled();

      // Second call - detect change
      await vi.advanceTimersByTimeAsync(5000);
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deleted',
          contentId: '2'
        })
      );
    });

    it('should detect updated content', async () => {
      const initialContent = [
        { id: '1', title: 'Content 1', status: 'published', show_in_menu: 1, updatedAt: '2024-01-01' }
      ];
      const updatedContent = [
        { id: '1', title: 'Updated Content 1', status: 'published', show_in_menu: 1, updatedAt: '2024-01-02' }
      ];

      mockContentService.getContentList
        .mockResolvedValueOnce(initialContent)
        .mockResolvedValueOnce(updatedContent);

      service.addListener(mockListener);
      service.startMonitoring();

      // First call - establish baseline
      await vi.advanceTimersByTimeAsync(0);
      expect(mockListener).not.toHaveBeenCalled();

      // Second call - detect change
      await vi.advanceTimersByTimeAsync(5000);
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'updated',
          contentId: '1',
          content: expect.objectContaining({ title: 'Updated Content 1' })
        })
      );
    });

    it('should detect reordered content', async () => {
      const initialContent = [
        { id: '1', title: 'Content 1', status: 'published', show_in_menu: 1, menu_order: 1 },
        { id: '2', title: 'Content 2', status: 'published', show_in_menu: 1, menu_order: 2 }
      ];
      const reorderedContent = [
        { id: '1', title: 'Content 1', status: 'published', show_in_menu: 1, menu_order: 2 },
        { id: '2', title: 'Content 2', status: 'published', show_in_menu: 1, menu_order: 1 }
      ];

      mockContentService.getContentList
        .mockResolvedValueOnce(initialContent)
        .mockResolvedValueOnce(reorderedContent);

      service.addListener(mockListener);
      service.startMonitoring();

      // First call - establish baseline
      await vi.advanceTimersByTimeAsync(0);
      expect(mockListener).not.toHaveBeenCalled();

      // Second call - detect change
      await vi.advanceTimersByTimeAsync(5000);
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reordered',
          contentId: 'all'
        })
      );
    });
  });

  describe('optimistic updates', () => {
    it('should apply optimistic create update', () => {
      const event: ContentUpdateEvent = {
        type: 'created',
        contentId: 'new-id',
        content: {
          id: 'new-id',
          title: 'New Content',
          status: 'published',
          show_in_menu: 1
        },
        timestamp: new Date()
      };

      service.addListener(mockListener);
      service.optimisticUpdate(event);

      expect(mockListener).toHaveBeenCalledWith(event);
    });

    it('should apply optimistic delete update', () => {
      const event: ContentUpdateEvent = {
        type: 'deleted',
        contentId: 'delete-id',
        timestamp: new Date()
      };

      service.addListener(mockListener);
      service.optimisticUpdate(event);

      expect(mockListener).toHaveBeenCalledWith(event);
    });

    it('should apply optimistic update', () => {
      const event: ContentUpdateEvent = {
        type: 'updated',
        contentId: 'update-id',
        content: {
          id: 'update-id',
          title: 'Updated Content',
          status: 'published',
          show_in_menu: 1
        },
        timestamp: new Date()
      };

      service.addListener(mockListener);
      service.optimisticUpdate(event);

      expect(mockListener).toHaveBeenCalledWith(event);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockContentService.getContentList.mockRejectedValue(new Error('API Error'));

      service.startMonitoring();
      await vi.advanceTimersByTimeAsync(5000);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to check for content updates:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle listener errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      service.addListener(errorListener);
      service.addListener(mockListener);

      const event: ContentUpdateEvent = {
        type: 'created',
        contentId: 'test-id',
        timestamp: new Date()
      };

      service.optimisticUpdate(event);

      expect(consoleSpy).toHaveBeenCalledWith('Error in content update listener:', expect.any(Error));
      expect(mockListener).toHaveBeenCalledWith(event); // Other listeners should still work
      consoleSpy.mockRestore();
    });
  });
});