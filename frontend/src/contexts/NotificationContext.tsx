import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  timestamp: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface NotificationState {
  notifications: Notification[];
}

type NotificationAction_Type = 
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'CLEAR_BY_TYPE'; payload: Notification['type'] };

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  clearByType: (type: Notification['type']) => void;
  // Convenience methods
  showSuccess: (title: string, message?: string, options?: Partial<Notification>) => string;
  showError: (title: string, message?: string, options?: Partial<Notification>) => string;
  showWarning: (title: string, message?: string, options?: Partial<Notification>) => string;
  showInfo: (title: string, message?: string, options?: Partial<Notification>) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction_Type
): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const notification: Notification = {
        ...action.payload,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      
      return {
        ...state,
        notifications: [...state.notifications, notification],
      };
    }
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
      };
    
    case 'CLEAR_BY_TYPE':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.type !== action.payload),
      };
    
    default:
      return state;
  }
};

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  maxNotifications = 5 
}) => {
  const [state, dispatch] = useReducer(notificationReducer, { notifications: [] });

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>): string => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

    // Auto-remove non-persistent notifications
    if (!notification.persistent) {
      const duration = notification.duration || (notification.type === 'error' ? 8000 : 5000);
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, duration);
    }

    // Remove oldest notifications if we exceed the limit
    if (state.notifications.length >= maxNotifications) {
      const oldestId = state.notifications[0]?.id;
      if (oldestId) {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: oldestId });
      }
    }

    return id;
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  const clearByType = (type: Notification['type']) => {
    dispatch({ type: 'CLEAR_BY_TYPE', payload: type });
  };

  const showSuccess = (
    title: string, 
    message?: string, 
    options?: Partial<Notification>
  ): string => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options,
    });
  };

  const showError = (
    title: string, 
    message?: string, 
    options?: Partial<Notification>
  ): string => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer duration for errors
      ...options,
    });
  };

  const showWarning = (
    title: string, 
    message?: string, 
    options?: Partial<Notification>
  ): string => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options,
    });
  };

  const showInfo = (
    title: string, 
    message?: string, 
    options?: Partial<Notification>
  ): string => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options,
    });
  };

  const value: NotificationContextType = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAll,
    clearByType,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Hook for handling API errors
export const useApiErrorHandler = () => {
  const { showError } = useNotifications();

  const handleApiError = (error: any, fallbackMessage = 'An unexpected error occurred') => {
    let title = 'Error';
    let message = fallbackMessage;

    if (error?.code) {
      // Handle specific error codes
      switch (error.code) {
        case 'NETWORK_ERROR':
          title = 'Network Error';
          message = 'Please check your internet connection and try again.';
          break;
        case 'AUTHENTICATION_FAILED':
          title = 'Authentication Failed';
          message = 'Please log in again to continue.';
          break;
        case 'INSUFFICIENT_PERMISSIONS':
          title = 'Access Denied';
          message = 'You do not have permission to perform this action.';
          break;
        case 'VALIDATION_ERROR':
          title = 'Validation Error';
          message = error.message || 'Please check your input and try again.';
          break;
        case 'NOT_FOUND':
          title = 'Not Found';
          message = 'The requested resource could not be found.';
          break;
        case 'RATE_LIMITED':
          title = 'Too Many Requests';
          message = 'Please wait a moment before trying again.';
          break;
        default:
          title = 'Error';
          message = error.message || fallbackMessage;
      }
    } else if (error?.message) {
      message = error.message;
    }

    return showError(title, message, {
      persistent: error?.code === 'AUTHENTICATION_FAILED',
    });
  };

  return { handleApiError };
};