import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse } from '../types';

export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  statusCode?: number;
  retryable?: boolean;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly timestamp: string;
  public readonly retryable: boolean;

  constructor(errorDetails: ApiErrorDetails) {
    super(errorDetails.message);
    this.name = 'ApiError';
    this.code = errorDetails.code;
    this.statusCode = errorDetails.statusCode || 500;
    this.details = errorDetails.details;
    this.timestamp = errorDetails.timestamp;
    this.retryable = errorDetails.retryable || false;
  }
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

class ApiService {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryCondition: (error: AxiosError) => {
        // Retry on network errors, timeouts, and 5xx errors
        return !error.response || 
               error.code === 'ECONNABORTED' ||
               (error.response.status >= 500 && error.response.status < 600);
      }
    };

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token and handle request deduplication
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.metadata = {
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          startTime: Date.now()
        };

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(this.createApiError(error));
      }
    );

    // Response interceptor to handle common errors and retries
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          const duration = Date.now() - (response.config.metadata?.startTime || 0);
          console.log(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle authentication errors
        if (error.response?.status === 401) {
          await this.handleAuthError();
          return Promise.reject(this.createApiError(error));
        }

        // Handle retry logic
        if (this.shouldRetry(error, originalRequest)) {
          return this.retryRequest(originalRequest);
        }

        return Promise.reject(this.createApiError(error));
      }
    );
  }

  private shouldRetry(error: AxiosError, config: any): boolean {
    if (!config || config.__retryCount >= this.retryConfig.maxRetries) {
      return false;
    }

    return this.retryConfig.retryCondition ? this.retryConfig.retryCondition(error) : false;
  }

  private async retryRequest(config: any): Promise<AxiosResponse> {
    config.__retryCount = (config.__retryCount || 0) + 1;
    
    const delay = this.retryConfig.retryDelay * Math.pow(2, config.__retryCount - 1);
    
    console.log(`Retrying request (attempt ${config.__retryCount}/${this.retryConfig.maxRetries}) after ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return this.client(config);
  }

  private async handleAuthError(): Promise<void> {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Dispatch custom event for auth error
    window.dispatchEvent(new CustomEvent('auth:error', {
      detail: { reason: 'token_expired' }
    }));

    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }

  private createApiError(error: AxiosError): ApiError {
    const response = error.response;
    const data = response?.data as any;

    // Extract error details from response
    const errorDetails: ApiErrorDetails = {
      code: data?.error?.code || error.code || 'UNKNOWN_ERROR',
      message: data?.error?.message || error.message || 'An unexpected error occurred',
      details: data?.error?.details,
      timestamp: data?.error?.timestamp || new Date().toISOString(),
      statusCode: response?.status || 500,
      retryable: this.isRetryableError(error)
    };

    // Log error details
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: response?.status,
      error: errorDetails
    });

    return new ApiError(errorDetails);
  }

  private isRetryableError(error: AxiosError): boolean {
    // Network errors are retryable
    if (!error.response) return true;
    
    // Server errors (5xx) are retryable
    if (error.response.status >= 500) return true;
    
    // Rate limiting might be retryable
    if (error.response.status === 429) return true;
    
    return false;
  }

  private async executeWithDeduplication<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if the same request is already in progress
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)!;
    }

    // Execute the request and store the promise
    const promise = requestFn().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, promise);
    return promise;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const key = `GET:${url}:${JSON.stringify(config?.params || {})}`;
    
    return this.executeWithDeduplication(key, async () => {
      try {
        const response = await this.client.get<ApiResponse<T>>(url, config);
        return response.data;
      } catch (error) {
        throw error instanceof ApiError ? error : this.createApiError(error as AxiosError);
      }
    });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.createApiError(error as AxiosError);
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.createApiError(error as AxiosError);
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.createApiError(error as AxiosError);
    }
  }

  async upload<T = any>(
    url: string, 
    formData: FormData, 
    config?: AxiosRequestConfig & { onUploadProgress?: (progress: number) => void }
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, formData, {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (config?.onUploadProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            config.onUploadProgress(progress);
          }
        },
        timeout: 300000, // 5 minutes for file uploads
      });
      return response.data;
    } catch (error) {
      throw error instanceof ApiError ? error : this.createApiError(error as AxiosError);
    }
  }

  // Network status checking
  async checkNetworkStatus(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    this.requestQueue.clear();
  }

  // Update retry configuration
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }
}

export const apiService = new ApiService();
export default apiService;