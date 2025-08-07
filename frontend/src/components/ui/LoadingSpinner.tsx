import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
  'aria-label'?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  'aria-label': ariaLabel = 'Loading'
}) => {
  const spinnerClass = [
    'loading-spinner',
    `loading-spinner-${size}`,
    `loading-spinner-${color}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={spinnerClass}
      role="status"
      aria-label={ariaLabel}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

export default LoadingSpinner;