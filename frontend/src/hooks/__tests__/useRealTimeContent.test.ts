import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealTimeContent } from '../useRealTimeContent';
import { contentService } from '../../services/contentService';
import { realTimeContentService } from '../../services/realTimeContentService';

// Mock the services
vi.mock('../../services/contentService');
vi.mock('../../services/realTimeContentService');

const mockContentService = contentService as any;
const mockRealTimeContentService = realTimeContentService as any;

describe('useRealTimeContent', () => {
  const mockContents = [
    {
      id: '1',
      title: 'Test Content 1',
      status: 'published',
      show_in_menu: 1,
      updatedAt: '2024-01-01'
    },
    {
      id: '2',
      title: 'Test Content 2',
      status: 'draft',
      show_in_menu: 1,
      updatedAt: '2024-01-02'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockContentService.getContentList.mockResolvedValue(mockContents);
    mockRealTimeContentService.addListener = vi.fn();
    mockRealTimeContentService.removeListener = vi.fn();
    mockRealTimeContentService.startMonitoring = vi.fn();
    mockRealTimeContentService.stopMonitoring = vi.fn();
    mockRealTimeContentService.setPollingInterval = vi.fn();
    mockRealTimeContentService.optimisticUpdate = vi.fn();
  });

  it('should load initial content', async () => {
    const { result } = renderHook(() => useRealTimeContent());

    expect(result.current.loading).toBe(true);
    expect(result.current.contents).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.contents).toEqual(mockContents);
    expect(result.current.error).toBeNull();
    expect(mockContentService.getContentList).toHaveBeenCalledTimes(1);
  });

  it('should start monitoring automatically by default', async () => {
    renderHook(() => useRealTimeContent());

    await waitFor(() => {
      expect(mockRealTimeContentService.addListener).toHaveBeenCalled();
      expect(mockRealTimeContentService.setPollingInterval).toHaveBeenCalledWith(5000);
      expect(mockRealTimeContentService.startMonitoring).toHaveBeenCalled();
    });
  });

  it('should not start monitoring when autoStart is false', async () => {
    renderHook(() => useRealTimeContent({ autoStart: false }));

    await waitFor(() => {
      expect(mockContentService.getContentList).toHaveBeenCalled();
    });

    expect(mockRealTimeContentService.startMonitoring).not.toHaveBeenCalled();
  });

  it('should use custom polling interval', async () => {
    renderHook(() => useRealTimeContent({ pollingInterval: 10000 }));

    await waitFor(() => {
      expect(mockRealTimeContentService.setPollingInterval).toHaveBeenCalledWith(10000);
    });
  });

  it('should handle content update events', async () => {
    let capturedListener: any;
    mockRealTimeContentService.addListener.mockImplementation((listener) => {
      capturedListener = listener;
    });

    const { result } = renderHook(() => useRealTimeContent());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate a content update event
    act(() => {
      capturedListener({
        type: 'created',
        contentId: '3',
        content: {
          id: '3',
          title: 'New Content',
          status: 'published',
          show_in_menu: 1,
          updatedAt: '2024-01-03'
        },
        timestamp: new Date()
      });
    });

    expect(result.current.contents).toHaveLength(3);
    expect(result.current.contents[2]).toEqual(
      expect.objectContaining({
        id: '3',
        title: 'New Content'
      })
    );
  });

  it('should handle content delete events', async () => {
    let capturedListener: any;
    mockRealTimeContentService.addListener.mockImplementation((listener) => {
      capturedListener = listener;
    });

    const { result } = renderHook(() => useRealTimeContent());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate a content delete event
    act(() => {
      capturedListener({
        type: 'deleted',
        contentId: '1',
        timestamp: new Date()
      });
    });

    expect(result.current.contents).toHaveLength(1);
    expect(result.current.contents[0].id).toBe('2');
  });

  it('should handle content update events', async () => {
    let capturedListener: any;
    mockRealTimeContentService.addListener.mockImplementation((listener) => {
      capturedListener = listener;
    });

    const { result } = renderHook(() => useRealTimeContent());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate a content update event
    act(() => {
      capturedListener({
        type: 'updated',
        contentId: '1',
        content: {
          id: '1',
          title: 'Updated Content 1',
          status: 'published',
          show_in_menu: 1,
          updatedAt: '2024-01-03'
        },
        timestamp: new Date()
      });
    });

    expect(result.current.contents[0]).toEqual(
      expect.objectContaining({
        id: '1',
        title: 'Updated Content 1'
      })
    );
  });

  it('should refresh contents on reorder events', async () => {
    let capturedListener: any;
    mockRealTimeContentService.addListener.mockImplementation((listener) => {
      capturedListener = listener;
    });

    const { result } = renderHook(() => useRealTimeContent());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the initial call
    mockContentService.getContentList.mockClear();

    // Simulate a reorder event
    act(() => {
      capturedListener({
        type: 'reordered',
        contentId: 'all',
        timestamp: new Date()
      });
    });

    expect(mockContentService.getContentList).toHaveBeenCalledTimes(1);
  });

  it('should call onContentUpdate callback when provided', async () => {
    const mockCallback = vi.fn();
    let capturedListener: any;
    mockRealTimeContentService.addListener.mockImplementation((listener) => {
      capturedListener = listener;
    });

    renderHook(() => useRealTimeContent({ onContentUpdate: mockCallback }));

    await waitFor(() => {
      expect(mockRealTimeContentService.addListener).toHaveBeenCalled();
    });

    const updateEvent = {
      type: 'created' as const,
      contentId: '3',
      content: {
        id: '3',
        title: 'New Content',
        status: 'published',
        show_in_menu: 1,
        updatedAt: '2024-01-03'
      },
      timestamp: new Date()
    };

    act(() => {
      capturedListener(updateEvent);
    });

    expect(mockCallback).toHaveBeenCalledWith(updateEvent);
  });

  it('should handle API errors', async () => {
    mockContentService.getContentList.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useRealTimeContent());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.contents).toEqual([]);
  });

  it('should provide manual refresh functionality', async () => {
    const { result } = renderHook(() => useRealTimeContent());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the initial call
    mockContentService.getContentList.mockClear();

    await act(async () => {
      await result.current.refreshContents();
    });

    expect(mockContentService.getContentList).toHaveBeenCalledTimes(1);
  });

  it('should provide optimistic update functionality', () => {
    const { result } = renderHook(() => useRealTimeContent());

    const updateEvent = {
      type: 'created' as const,
      contentId: '3',
      content: {
        id: '3',
        title: 'New Content',
        status: 'published',
        show_in_menu: 1,
        updatedAt: '2024-01-03'
      },
      timestamp: new Date()
    };

    act(() => {
      result.current.optimisticUpdate(updateEvent);
    });

    expect(mockRealTimeContentService.optimisticUpdate).toHaveBeenCalledWith(updateEvent);
  });

  it('should provide monitoring controls', async () => {
    const { result } = renderHook(() => useRealTimeContent({ autoStart: false }));

    expect(result.current.isMonitoring).toBe(false);

    act(() => {
      result.current.startMonitoring();
    });

    expect(mockRealTimeContentService.startMonitoring).toHaveBeenCalled();

    act(() => {
      result.current.stopMonitoring();
    });

    expect(mockRealTimeContentService.stopMonitoring).toHaveBeenCalled();
  });

  it('should cleanup listeners on unmount', () => {
    const { unmount } = renderHook(() => useRealTimeContent());

    unmount();

    expect(mockRealTimeContentService.removeListener).toHaveBeenCalled();
  });
});