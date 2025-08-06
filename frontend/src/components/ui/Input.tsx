import { InputHTMLAttributes, forwardRef } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  
  const inputClass = [
    'input',
    hasError ? 'input-error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      
      <input
        ref={ref}
        id={inputId}
        className={inputClass}
        aria-invalid={hasError}
        aria-describedby={
          error ? `${inputId}-error` : 
          helperText ? `${inputId}-helper` : 
          undefined
        }
        {...props}
      />
      
      {error && (
        <div id={`${inputId}-error`} className="input-error-text" role="alert">
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div id={`${inputId}-helper`} className="input-helper-text">
          {helperText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;