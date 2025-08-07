import React, { SelectHTMLAttributes, forwardRef } from 'react';
import './Select.css';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  options,
  placeholder,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  
  const selectClass = [
    'select',
    hasError ? 'select-error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="select-group">
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
        </label>
      )}
      
      <select
        ref={ref}
        id={selectId}
        className={selectClass}
        aria-invalid={hasError}
        aria-describedby={
          error ? `${selectId}-error` : 
          helperText ? `${selectId}-helper` : 
          undefined
        }
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <div id={`${selectId}-error`} className="select-error-text" role="alert">
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div id={`${selectId}-helper`} className="select-helper-text">
          {helperText}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;