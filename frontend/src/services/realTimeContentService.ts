import { ContentListItem } from '../types';
import { contentService } from './contentService';

export interface ContentUpdateEvent {
  type: 'created' | 'updated' | 'deleted' | 'reordered';
  contentId: string;
  content?: ContentListItem;
  timestamp: Date;
}

export interface ContentUpdateListener {
  (event: ContentUpdateEvent): void;
}

export interface RealTimeServiceError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
  retryCount: number;
}

export interface RealTimeServiceStatus {
  isPolling: boolean;
  lastUpdate: Date;
  lastError: RealTimeServiceError | null;
  listenerCount: number;
  consecutiveErrors: number;
  isHealthy: boolean;
}

export class RealTimeContentService {
  private listeners: Set<ContentUpdateListener> = new Set();
  private errorListeners: Set<(error: RealTimeServiceError) => void> = new Set();
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: Date = new Date();
  private isPolling = false;
  private pollingIntervalMs = 5000; // 5 seconds
  private lastKnownContents: ContentListItem[] = [];
  private lastError: RealTimeServiceError | null = null;
  private consecutiveErrors = 0;
  private maxRetries = 3;
  private backoffMultiplier = 2;
  private maxBackoffMs = 30000; // 30 seconds

  /**
   * Start real-time content monitoring
   */
  startMonitoring(): void {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    this.pollingInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.pollingIntervalMs);

    // Initial load
    this.checkForUpdates();
  }

  /**
   * Stop real-time content monitoring
   */
  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Add a listener for content updates
   */
  addListener(listener: ContentUpdateListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a listener for content updates
   */
  removeListener(listener: ContentUpdateListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Manually trigger an update check
   */
  async checkForUpdates(): Promise<void> {
    try {
      const currentContents = await contentService.getContentList();
      
      if (this.lastKnownContents.length === 0) {
        // First load - just store the contents
        this.lastKnownContents = [...currentContents];
        this.clearError();
        return;
      }

      // Compare with last known state to detect changes
      const changes = this.detectChanges(this.lastKnownContents, currentContents);
      
      // Emit events for each change
      changes.forEach(change => {
        this.emitEvent(change);
      });

      // Update last known state
      this.lastKnownContents = [...currentContents];
      this.lastUpdateTime = new Date();
      this.clearError();
    } catch (error) {
      this.handleError(error, 'checkForUpdates');
    }
  }

  /**
   * Add an error listener
   */
  addErrorListener(listener: (error: RealTimeServiceError) => void): void {
    this.errorListeners.add(listener);
  }

  /**
   * Remove an error listener
   */
  removeErrorListener(listener: (error: RealTimeServiceError) => void): void {
    this.errorListeners.delete(listener);
  }

  /**
   * Get detailed service status
   */
  getDetailedStatus(): RealTimeServiceStatus {
    return {
      isPolling: this.isPolling,
      lastUpdate: this.lastUpdateTime,
      lastError: this.lastError,
      listenerCount: this.listeners.size,
      consecutiveErrors: this.consecutiveErrors,
      isHealthy: this.consecutiveErrors < this.maxRetries && this.lastError === null
    };
  }

  /**
   * Retry failed operations with exponential backoff
   */
  async retryOperation(): Promise<void> {
    if (!this.lastError?.retryable) {
      throw new Error('Last error is not retryable');
    }

    const backoffMs = Math.min(
      this.pollingIntervalMs * Math.pow(this.backoffMultiplier, this.consecutiveErrors),
      this.maxBackoffMs
    );

    await new Promise(resolve => setTimeout(resolve, backoffMs));
    await this.checkForUpdates();
  }

  /**
   * Force refresh - clears error state and retries
   */
  async forceRefresh(): Promise<void> {
    this.clearError();
    await this.checkForUpdates();
  }

  private handleError(error: any, operation: string): void {
    this.consecutiveErrors++;
    
    const serviceError: RealTimeServiceError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      timestamp: new Date(),
      retryable: this.isRetryableError(error),
      retryCount: this.consecutiveErrors
    };

    this.lastError = serviceError;

    // Emit error to listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(serviceError);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // If we've exceeded max retries, stop polling
    if (this.consecutiveErrors >= this.maxRetries) {
      console.error(`Real-time service stopped after ${this.maxRetries} consecutive errors`);
      this.stopMonitoring();
    }

    console.error(`Real-time service error in ${operation}:`, error);
  }

  private clearError(): void {
    this.consecutiveErrors = 0;
    this.lastError = null;
  }

  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx server errors are retryable
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return true;
    }
    
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // 4xx client errors are generally not retryable
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    
    return true; // Default to retryable for unknown errors
  }

  /**
   * Optimistically update content (for immediate UI feedback)
   */
  optimisticUpdate(event: ContentUpdateEvent): void {
    // Apply optimistic update to local state
    switch (event.type) {
      case 'created':
        if (event.content) {
          this.lastKnownContents.push(event.content);
        }
        break;
      case 'updated':
        if (event.content) {
          const index = this.lastKnownContents.findIndex(c => c.id === event.contentId);
          if (index !== -1) {
            this.lastKnownContents[index] = event.content;
          }
        }
        break;
      case 'deleted':
        this.lastKnownContents = this.lastKnownContents.filter(c => c.id !== event.contentId);
        break;
      case 'reordered':
        // For reordering, we'll need to refresh from server
        this.checkForUpdates();
        return;
    }

    // Emit the event immediately
    this.emitEvent(event);
  }

  /**
   * Get the current polling status (legacy method for backward compatibility)
   */
  getStatus(): { isPolling: boolean; lastUpdate: Date; listenerCount: number } {
    return {
      isPolling: this.isPolling,
      lastUpdate: this.lastUpdateTime,
      listenerCount: this.listeners.size
    };
  }

  /**
   * Set polling interval (in milliseconds)
   */
  setPollingInterval(intervalMs: number): void {
    this.pollingIntervalMs = intervalMs;
    
    // Restart polling with new interval if currently polling
    if (this.isPolling) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  private detectChanges(oldContents: ContentListItem[], newContents: ContentListItem[]): ContentUpdateEvent[] {
    const changes: ContentUpdateEvent[] = [];
    const oldMap = new Map(oldContents.map(c => [c.id, c]));
    const newMap = new Map(newContents.map(c => [c.id, c]));

    // Check for created content
    newContents.forEach(newContent => {
      if (!oldMap.has(newContent.id)) {
        changes.push({
          type: 'created',
          contentId: newContent.id,
          content: newContent,
          timestamp: new Date()
        });
      }
    });

    // Check for deleted content
    oldContents.forEach(oldContent => {
      if (!newMap.has(oldContent.id)) {
        changes.push({
          type: 'deleted',
          contentId: oldContent.id,
          timestamp: new Date()
        });
      }
    });

    // Check for updated content
    newContents.forEach(newContent => {
      const oldContent = oldMap.get(newContent.id);
      if (oldContent && this.hasContentChanged(oldContent, newContent)) {
        changes.push({
          type: 'updated',
          contentId: newContent.id,
          content: newContent,
          timestamp: new Date()
        });
      }
    });

    // Check for reordering (if menu_order changed for any item)
    const orderChanged = newContents.some(newContent => {
      const oldContent = oldMap.get(newContent.id);
      return oldContent && oldContent.menu_order !== newContent.menu_order;
    });

    if (orderChanged) {
      changes.push({
        type: 'reordered',
        contentId: 'all', // Special case for reordering
        timestamp: new Date()
      });
    }

    return changes;
  }

  private hasContentChanged(oldContent: ContentListItem, newContent: ContentListItem): boolean {
    // Check key fields that would affect menu display
    return (
      oldContent.title !== newContent.title ||
      oldContent.menu_title !== newContent.menu_title ||
      oldContent.status !== newContent.status ||
      oldContent.show_in_menu !== newContent.show_in_menu ||
      oldContent.parent_id !== newContent.parent_id ||
      oldContent.updatedAt !== newContent.updatedAt
    );
  }

  private emitEvent(event: ContentUpdateEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in content update listener:', error);
      }
    });
  }
}

export const realTimeContentService = new RealTimeContentService();