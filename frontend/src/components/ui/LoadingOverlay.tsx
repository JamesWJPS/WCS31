import React, { ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  message?: string;
  className?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message = 'Loading...',
  className = ''
}) => {
  const overlayClass = [
    'loading-overlay-container',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={overlayClass}>
      {children}
      {isLoading && (
        <div className="loading-overlay" aria-live="polite">
          <div className="loading-overlay-content">
            <LoadingSpinner size="lg" aria-label={message} />
            <span className="loading-overlay-message">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;