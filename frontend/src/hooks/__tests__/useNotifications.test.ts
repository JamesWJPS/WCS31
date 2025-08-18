import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNotifications } from '../useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty notifications array', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.notifications).toEqual([]);
  });

  it('adds notifications correctly', () => {
    const { result } = renderHook(() => useNotifications());
    
    let id: string;
    
    act(() => {
      id = result.current.addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message'
      });
    });
    
    expect(id!).toBeDefined();
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      type: 'success',
      title: 'Test',
      message: 'Test message'
    });
  });

  it('generates unique IDs for notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    let id1: string, id2: string;
    
    act(() => {
      id1 = result.current.addNotification({
        type: 'success',
        title: 'Test 1',
        message: 'Test message 1'
      });
      
      id2 = result.current.addNotification({
        type: 'error',
        title: 'Test 2',
        message: 'Test message 2'
      });
    });
    
    expect(id1).not.toBe(id2);
    expect(result.current.notifications).toHaveLength(2);
  });

  it('removes notifications correctly', () => {
    const { result } = renderHook(() => useNotifications());
    
    let notificationId: string;
    
    act(() => {
      notificationId = result.current.addNotification({
        type: 'info',
        title: 'Test',
        message: 'Test message'
      });
    });
    
    expect(result.current.notifications).toHaveLength(1);
    
    act(() => {
      result.current.removeNotification(notificationId);
    });
    
    expect(result.current.notifications).toHaveLength(0);
  });

  it('clears all notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Test 1',
        message: 'Test message 1'
      });
      
      result.current.addNotification({
        type: 'error',
        title: 'Test 2',
        message: 'Test message 2'
      });
    });
    
    expect(result.current.notifications).toHaveLength(2);
    
    act(() => {
      result.current.clearAllNotifications();
    });
    
    expect(result.current.notifications).toHaveLength(0);
  });

  it('limits notifications to maxNotifications', () => {
    const { result } = renderHook(() => useNotifications({ maxNotifications: 2 }));
    
    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Test 1',
        message: 'Test message 1'
      });
      
      result.current.addNotification({
        type: 'info',
        title: 'Test 2',
        message: 'Test message 2'
      });
      
      result.current.addNotification({
        type: 'info',
        title: 'Test 3',
        message: 'Test message 3'
      });
    });
    
    expect(result.current.notifications).toHaveLength(2);
    // Should keep the most recent notifications
    expect(result.current.notifications[0].title).toBe('Test 3');
    expect(result.current.notifications[1].title).toBe('Test 2');
  });

  it('uses default duration when not specified', () => {
    const { result } = renderHook(() => useNotifications({ defaultDuration: 3000 }));
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message'
      });
    });
    
    expect(result.current.notifications[0].duration).toBe(3000);
  });

  it('overrides default duration when specified', () => {
    const { result } = renderHook(() => useNotifications({ defaultDuration: 3000 }));
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message',
        duration: 1000
      });
    });
    
    expect(result.current.notifications[0].duration).toBe(1000);
  });

  describe('Convenience methods', () => {
    it('addSuccessNotification creates success notification', () => {
      const { result } = renderHook(() => useNotifications());
      
      act(() => {
        result.current.addSuccessNotification('Success', 'Operation completed');
      });
      
      expect(result.current.notifications[0]).toMatchObject({
        type: 'success',
        title: 'Success',
        message: 'Operation completed'
      });
    });

    it('addErrorNotification creates error notification with no auto-dismiss', () => {
      const { result } = renderHook(() => useNotifications());
      
      act(() => {
        result.current.addErrorNotification('Error', 'Something went wrong');
      });
      
      expect(result.current.notifications[0]).toMatchObject({
        type: 'error',
        title: 'Error',
        message: 'Something went wrong',
        duration: 0
      });
    });

    it('addWarningNotification creates warning notification with longer duration', () => {
      const { result } = renderHook(() => useNotifications());
      
      act(() => {
        result.current.addWarningNotification('Warning', 'Please check input');
      });
      
      expect(result.current.notifications[0]).toMatchObject({
        type: 'warning',
        title: 'Warning',
        message: 'Please check input',
        duration: 8000
      });
    });

    it('addInfoNotification creates info notification', () => {
      const { result } = renderHook(() => useNotifications());
      
      act(() => {
        result.current.addInfoNotification('Info', 'Here is some information');
      });
      
      expect(result.current.notifications[0]).toMatchObject({
        type: 'info',
        title: 'Info',
        message: 'Here is some information'
      });
    });

    it('convenience methods support actions', () => {
      const { result } = renderHook(() => useNotifications());
      const mockAction = { label: 'Retry', action: vi.fn(), variant: 'primary' as const };
      
      act(() => {
        result.current.addErrorNotification('Error', 'Failed', [mockAction]);
      });
      
      expect(result.current.notifications[0].actions).toEqual([mockAction]);
    });
  });

  it('adds timestamp to notifications', () => {
    const { result } = renderHook(() => useNotifications());
    const beforeTime = new Date();
    
    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Test',
        message: 'Test message'
      });
    });
    
    const afterTime = new Date();
    const notificationTime = result.current.notifications[0].timestamp;
    
    expect(notificationTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(notificationTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it('maintains notification order (newest first)', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'First',
        message: 'First message'
      });
    });
    
    // Small delay to ensure different timestamps
    act(() => {
      vi.advanceTimersByTime(1);
    });
    
    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Second',
        message: 'Second message'
      });
    });
    
    expect(result.current.notifications[0].title).toBe('Second');
    expect(result.current.notifications[1].title).toBe('First');
  });
});