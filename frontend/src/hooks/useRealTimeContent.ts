import { useState, useEffect, useCallback, useRef } from 'react';
import { ContentListItem, ErrorState, LoadingState } from '../types';
import { contentService } from '../services/contentService';
import { realTimeContentService, ContentUpdateEvent, RealTimeServiceError } from '../services/realTimeContentService';

export interface UseRealTimeContentOptions {
  autoStart?: boolean;
  pollingInterval?: number;
  onContentUpdate?: (event: ContentUpdateEvent) => void;
}

export interface UseRealTimeContentReturn {
  contents: ContentListItem[];
  loading: boolean;
  loadingState: LoadingState;
  error: string | null;
  errorState: ErrorState | null;
  lastUpdate: Date | null;
  isMonitoring: boolean;
  isHealthy: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refreshContents: () => Promise<void>;
  optimisticUpdate: (event: ContentUpdateEvent) => void;
  retryLastOperation: () => Promise<void>;
  clearError: () => void;
}

export const useRealTimeContent = (options: UseRealTimeContentOptions = {}): UseRealTimeContentReturn => {
  const {
    autoStart = true,
    pollingInterval = 5000,
    onContentUpdate
  } = options;

  const [contents, setContents] = useState<ContentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: true, operation: 'initial-load' });
  const [error, setError] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isHealthy, setIsHealthy] = useState(true);
  
  // Use ref to store the latest callback to avoid stale closures
  const onContentUpdateRef = useRef(onContentUpdate);
  onContentUpdateRef.current = onContentUpdate;

  // Content update handler
  const handleContentUpdate = useCallback((event: ContentUpdateEvent) => {
    setLastUpdate(new Date());
    
    // Apply the update to local state
    setContents(prevContents => {
      let newContents = [...prevContents];
      
      switch (event.type) {
        case 'created':
          if (event.content && !newContents.find(c => c.id === event.contentId)) {
            newContents.push(event.content);
          }
          break;
        case 'updated':
          if (event.content) {
            const index = newContents.findIndex(c => c.id === event.contentId);
            if (index !== -1) {
              newContents[index] = event.content;
            }
          }
          break;
        case 'deleted':
          newContents = newContents.filter(c => c.id !== event.contentId);
          break;
        case 'reordered':
          // For reordering, we need to refresh from server to get correct order
          refreshContents();
          return prevContents; // Don't update state here, let refresh handle it
      }
      
      return newContents;
    });

    // Call the optional callback
    if (onContentUpdateRef.current) {
      onContentUpdateRef.current(event);
    }
  }, []);

  // Handle real-time service errors
  const handleRealTimeError = useCallback((serviceError: RealTimeServiceError) => {
    const errorState: ErrorState = {
      code: serviceError.code,
      message: serviceError.message,
      timestamp: serviceError.timestamp,
      retryable: serviceError.retryable,
      details: {
        retryCount: serviceError.retryCount,
        operation: 'real-time-update'
      }
    };
    
    setErrorState(errorState);
    setError(serviceError.message);
    setIsHealthy(false);
  }, []);

  // Load initial content
  const refreshContents = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingState({ isLoading: true, operation: 'refresh-contents' });
      setError(null);
      setErrorState(null);
      
      const contentList = await contentService.getContentList();
      setContents(contentList);
      setLastUpdate(new Date());
      setIsHealthy(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load content';
      const errorState: ErrorState = {
        code: 'CONTENT_LOAD_ERROR',
        message: errorMessage,
        timestamp: new Date(),
        retryable: true,
        details: {
          operation: 'refresh-contents'
        }
      };
      
      setError(errorMessage);
      setErrorState(errorState);
      setIsHealthy(false);
      console.error('Failed to refresh contents:', err);
    } finally {
      setLoading(false);
      setLoadingState({ isLoading: false });
    }
  }, []);

  // Retry last failed operation
  const retryLastOperation = useCallback(async () => {
    if (!errorState?.retryable) {
      throw new Error('Last error is not retryable');
    }

    try {
      setLoadingState({ isLoading: true, operation: 'retry-operation' });
      
      if (errorState.details?.operation === 'real-time-update') {
        await realTimeContentService.retryOperation();
      } else {
        await refreshContents();
      }
    } catch (err) {
      console.error('Retry operation failed:', err);
      throw err;
    } finally {
      setLoadingState({ isLoading: false });
    }
  }, [errorState, refreshContents]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
    setErrorState(null);
    setIsHealthy(true);
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    realTimeContentService.setPollingInterval(pollingInterval);
    realTimeContentService.addListener(handleContentUpdate);
    realTimeContentService.addErrorListener(handleRealTimeError);
    realTimeContentService.startMonitoring();
    setIsMonitoring(true);
  }, [isMonitoring, pollingInterval, handleContentUpdate, handleRealTimeError]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    realTimeContentService.removeListener(handleContentUpdate);
    realTimeContentService.removeErrorListener(handleRealTimeError);
    realTimeContentService.stopMonitoring();
    setIsMonitoring(false);
  }, [isMonitoring, handleContentUpdate, handleRealTimeError]);

  // Optimistic update
  const optimisticUpdate = useCallback((event: ContentUpdateEvent) => {
    realTimeContentService.optimisticUpdate(event);
  }, []);

  // Initial load and auto-start monitoring
  useEffect(() => {
    refreshContents();
    
    if (autoStart) {
      // Start monitoring after initial load
      const timer = setTimeout(() => {
        startMonitoring();
      }, 1000); // Small delay to allow initial load to complete
      
      return () => clearTimeout(timer);
    }
  }, [refreshContents, startMonitoring, autoStart]);

  // Monitor service health
  useEffect(() => {
    const checkHealth = () => {
      const status = realTimeContentService.getDetailedStatus();
      setIsHealthy(status.isHealthy);
    };

    const healthCheckInterval = setInterval(checkHealth, 10000); // Check every 10 seconds
    return () => clearInterval(healthCheckInterval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        realTimeContentService.removeListener(handleContentUpdate);
        realTimeContentService.removeErrorListener(handleRealTimeError);
        // Don't stop monitoring here as other components might be using it
      }
    };
  }, [isMonitoring, handleContentUpdate, handleRealTimeError]);

  return {
    contents,
    loading,
    loadingState,
    error,
    errorState,
    lastUpdate,
    isMonitoring,
    isHealthy,
    startMonitoring,
    stopMonitoring,
    refreshContents,
    optimisticUpdate,
    retryLastOperation,
    clearError
  };
};