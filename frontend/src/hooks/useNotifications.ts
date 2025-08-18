import { useState, useCallback } from 'react';
import { NotificationState, NotificationAction } from '../types';

export interface UseNotificationsOptions {
  maxNotifications?: number;
  defaultDuration?: number;
}

export interface UseNotificationsReturn {
  notifications: NotificationState[];
  addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addSuccessNotification: (title: string, message: string, actions?: NotificationAction[]) => string;
  addErrorNotification: (title: string, message: string, actions?: NotificationAction[]) => string;
  addWarningNotification: (title: string, message: string, actions?: NotificationAction[]) => string;
  addInfoNotification: (title: string, message: string, actions?: NotificationAction[]) => string;
}

export const useNotifications = (options: UseNotificationsOptions = {}): UseNotificationsReturn => {
  const {
    maxNotifications = 10,
    defaultDuration = 5000
  } = options;

  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationState, 'id' | 'timestamp'>) => {
    const id = generateId();
    const newNotification: NotificationState = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? defaultDuration
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the most recent notifications
      return updated.slice(0, maxNotifications);
    });

    return id;
  }, [generateId, defaultDuration, maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const addSuccessNotification = useCallback((
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ) => {
    return addNotification({
      type: 'success',
      title,
      message,
      actions
    });
  }, [addNotification]);

  const addErrorNotification = useCallback((
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ) => {
    return addNotification({
      type: 'error',
      title,
      message,
      actions,
      duration: 0 // Error notifications don't auto-dismiss
    });
  }, [addNotification]);

  const addWarningNotification = useCallback((
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      actions,
      duration: 8000 // Warnings stay longer
    });
  }, [addNotification]);

  const addInfoNotification = useCallback((
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ) => {
    return addNotification({
      type: 'info',
      title,
      message,
      actions
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    addSuccessNotification,
    addErrorNotification,
    addWarningNotification,
    addInfoNotification
  };
};