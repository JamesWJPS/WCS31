import React, { ReactNode } from 'react';
import Button from './Button';
import './ErrorMessage.css';

interface ErrorMessageProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  showIcon?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  children?: ReactNode;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  type = 'error',
  showIcon = true,
  onRetry,
  onDismiss,
  children,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const errorClass = [
    'error-message',
    `error-message-${type}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={errorClass} role="alert">
      <div className="error-message-content">
        {showIcon && (
          <div className="error-message-icon" aria-hidden="true">
            {getIcon()}
          </div>
        )}
        
        <div className="error-message-text">
          {title && (
            <h3 className="error-message-title">{title}</h3>
          )}
          <p className="error-message-description">{message}</p>
          {children}
        </div>
        
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="error-message-dismiss"
          >
            ×
          </Button>
        )}
      </div>
      
      {onRetry && (
        <div className="error-message-actions">
          <Button size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorMessage;