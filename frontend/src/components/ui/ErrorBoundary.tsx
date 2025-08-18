import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from './Button';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'global' | 'component' | 'route';
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error details for debugging
    this.logError(error, errorInfo);
    
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || 'anonymous',
      errorId: this.state.errorId
    };

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error reporting service (e.g., Sentry, LogRocket)
      console.error('Production error logged:', errorData);
    }

    // Store error in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingErrors.push(errorData);
      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('errorLogs', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: '',
      retryCount: 0
    });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= 3) {
      // After 3 retries, suggest page refresh
      window.location.reload();
      return;
    }

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: retryCount + 1
    });

    // Auto-reset after 5 seconds if error persists
    this.resetTimeoutId = window.setTimeout(() => {
      if (this.state.hasError) {
        this.resetErrorBoundary();
      }
    }, 5000);
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error) return;

    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Copy error report to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error report copied to clipboard. Please share this with support.');
      })
      .catch(() => {
        console.error('Failed to copy error report:', errorReport);
        alert('Error report logged to console. Please check browser console and share with support.');
      });
  };

  private getErrorMessage = (): string => {
    const { error } = this.state;
    const { level } = this.props;

    if (!error) return 'An unexpected error occurred';

    // Provide user-friendly messages based on error type
    if (error.name === 'ChunkLoadError') {
      return 'Failed to load application resources. This might be due to a network issue or an application update.';
    }

    if (error.message.includes('Loading chunk')) {
      return 'Failed to load part of the application. Please refresh the page to get the latest version.';
    }

    if (error.message.includes('Network Error')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }

    if (level === 'global') {
      return 'A critical error occurred in the application. Please refresh the page or contact support if the problem persists.';
    }

    return 'Something went wrong with this component. You can try again or refresh the page.';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component', retryCount } = this.props;
      const { errorId } = this.state;
      const isGlobalError = level === 'global';

      return (
        <div className={`error-boundary error-boundary--${level}`} role="alert">
          <div className="error-boundary-content">
            <div className="error-boundary-icon" aria-hidden="true">
              {isGlobalError ? '🚨' : '⚠️'}
            </div>
            <h2 className="error-boundary-title">
              {isGlobalError ? 'Application Error' : 'Something went wrong'}
            </h2>
            <p className="error-boundary-message">
              {this.getErrorMessage()}
            </p>
            
            {errorId && (
              <p className="error-boundary-error-id">
                Error ID: <code>{errorId}</code>
              </p>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary-details">
                <summary>Error details (development only)</summary>
                <pre className="error-boundary-stack">
                  <strong>Error:</strong> {this.state.error.toString()}
                  {this.state.error.stack}
                  
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <br /><br />
                      <strong>Component Stack:</strong>
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div className="error-boundary-actions">
              <Button onClick={this.handleRetry}>
                {retryCount >= 3 ? 'Refresh Page' : 'Try Again'}
              </Button>
              
              {!isGlobalError && (
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              )}

              {process.env.NODE_ENV === 'production' && (
                <Button 
                  variant="outline" 
                  onClick={this.handleReportError}
                >
                  Report Error
                </Button>
              )}
            </div>

            {retryCount > 0 && (
              <p className="error-boundary-retry-info">
                Retry attempt: {retryCount}/3
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;