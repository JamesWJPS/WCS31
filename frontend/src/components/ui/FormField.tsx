import React, { ReactNode } from 'react';
import './FormField.css';

interface FormFieldProps {
  children: ReactNode;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  error,
  helperText,
  required = false,
  className = ''
}) => {
  const fieldClass = [
    'form-field',
    error ? 'form-field-error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={fieldClass}>
      {label && (
        <label className="form-field-label">
          {label}
          {required && (
            <span className="form-field-required" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      <div className="form-field-input">
        {children}
      </div>
      
      {error && (
        <div className="form-field-error-text" role="alert">
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div className="form-field-helper-text">
          {helperText}
        </div>
      )}
    </div>
  );
};

export default FormField;