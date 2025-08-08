import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  lastChecked: Date | null;
  retryCount: number;
  isRetrying: boolean;
}

export interface UseNetworkStatusOptions {
  checkInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  showNotifications?: boolean;
}

export interface UseNetworkStatusReturn extends NetworkStatus {
  checkConnection: () => Promise<boolean>;
  retry: () => Promise<void>;
  resetRetryCount: () => void;
}

export const useNetworkStatus = (options: UseNetworkStatusOptions = {}): UseNetworkStatusReturn => {
  const {
    checkInterval = 30000, // 30 seconds
    maxRetries = 3,
    retryDelay = 2000,
    showNotifications = true
  } = options;

  const { showError, showSuccess, showWarning } = useNotifications();

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isConnected: true,
    lastChecked: null,
    retryCount: 0,
    isRetrying: false
  });

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await apiService.checkNetworkStatus();
      const now = new Date();

      setStatus(prev => ({
        ...prev,
        isConnected,
        lastChecked: now,
        retryCount: isConnected ? 0 : prev.retryCount
      }));

      // Show notifications for connection changes
      if (showNotifications) {
        if (isConnected && !status.isConnected && status.lastChecked) {
          showSuccess('Connection Restored', 'Your internet connection has been restored.');
        } else if (!isConnected && status.isConnected) {
          showWarning('Connection Lost', 'Unable to connect to the server. Please check your internet connection.');
        }
      }

      return isConnected;
    } catch (error) {
      console.error('Network check failed:', error);
      
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        lastChecked: new Date()
      }));

      return false;
    }
  }, [status.isConnected, status.lastChecked, showNotifications, showError, showSuccess, showWarning]);

  const retry = useCallback(async (): Promise<void> => {
    if (status.retryCount >= maxRetries) {
      if (showNotifications) {
        showError(
          'Connection Failed', 
          `Unable to connect after ${maxRetries} attempts. Please check your internet connection and try again.`,
          { persistent: true }
        );
      }
      return;
    }

    setStatus(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }));

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, status.retryCount)));

    try {
      const isConnected = await checkConnection();
      
      if (!isConnected && status.retryCount < maxRetries - 1) {
        // Schedule next retry
        setTimeout(() => retry(), retryDelay);
      }
    } finally {
      setStatus(prev => ({
        ...prev,
        isRetrying: false
      }));
    }
  }, [status.retryCount, maxRetries, retryDelay, checkConnection, showNotifications, showError]);

  const resetRetryCount = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      retryCount: 0,
      isRetrying: false
    }));
  }, []);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      checkConnection();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false, isConnected: false }));
      
      if (showNotifications) {
        showWarning('You are offline', 'Please check your internet connection.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection, showNotifications, showWarning]);

  // Periodic connection checks
  useEffect(() => {
    if (!checkInterval) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [checkConnection, checkInterval]);

  // Initial connection check
  useEffect(() => {
    checkConnection();
  }, []);

  return {
    ...status,
    checkConnection,
    retry,
    resetRetryCount
  };
};

// Hook for handling network-related errors in components
export const useNetworkErrorHandler = () => {
  const networkStatus = useNetworkStatus();
  const { showError, showWarning } = useNotifications();

  const handleNetworkError = useCallback((error: any, context?: string) => {
    if (!networkStatus.isOnline) {
      showWarning(
        'You are offline',
        'Please check your internet connection and try again when you\'re back online.'
      );
      return;
    }

    if (!networkStatus.isConnected) {
      showError(
        'Connection Error',
        'Unable to connect to the server. Please try again in a moment.',
        {
          actions: [
            {
              label: 'Retry',
              action: networkStatus.retry,
              variant: 'primary'
            }
          ]
        }
      );
      return;
    }

    // Handle other network errors
    const contextMessage = context ? ` while ${context}` : '';
    
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      showError(
        'Request Timeout',
        `The request timed out${contextMessage}. Please try again.`,
        {
          actions: [
            {
              label: 'Retry',
              action: () => window.location.reload(),
              variant: 'primary'
            }
          ]
        }
      );
    } else if (error?.response?.status >= 500) {
      showError(
        'Server Error',
        `A server error occurred${contextMessage}. Please try again later.`,
        {
          actions: [
            {
              label: 'Retry',
              action: () => window.location.reload(),
              variant: 'primary'
            }
          ]
        }
      );
    } else {
      showError(
        'Network Error',
        `A network error occurred${contextMessage}. Please check your connection and try again.`
      );
    }
  }, [networkStatus, showError, showWarning]);

  return {
    networkStatus,
    handleNetworkError
  };
};