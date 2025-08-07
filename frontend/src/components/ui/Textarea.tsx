import React, { TextareaHTMLAttributes, forwardRef } from 'react';
import './Textarea.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  resize = 'vertical',
  className = '',
  id,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  
  const textareaClass = [
    'textarea',
    `textarea-resize-${resize}`,
    hasError ? 'textarea-error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="textarea-group">
      {label && (
        <label htmlFor={textareaId} className="textarea-label">
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={textareaId}
        className={textareaClass}
        aria-invalid={hasError}
        aria-describedby={
          error ? `${textareaId}-error` : 
          helperText ? `${textareaId}-helper` : 
          undefined
        }
        {...props}
      />
      
      {error && (
        <div id={`${textareaId}-error`} className="textarea-error-text" role="alert">
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div id={`${textareaId}-helper`} className="textarea-helper-text">
          {helperText}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;