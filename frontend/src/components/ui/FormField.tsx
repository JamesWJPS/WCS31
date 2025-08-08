import React, { ReactNode, cloneElement, isValidElement } from 'react';
import { FieldError } from '../../hooks/useFormValidation';
import './FormField.css';

interface FormFieldProps {
  children: ReactNode;
  label?: string;
  error?: string | FieldError | null;
  helperText?: string;
  required?: boolean;
  className?: string;
  fieldId?: string;
  showErrorIcon?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  error,
  helperText,
  required = false,
  className = '',
  fieldId,
  showErrorIcon = true
}) => {
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const errorType = typeof error === 'object' && error ? error.type : undefined;
  
  const fieldClass = [
    'form-field',
    errorMessage ? 'form-field-error' : '',
    className
  ].filter(Boolean).join(' ');

  // Generate unique IDs for accessibility
  const inputId = fieldId || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  // Clone children to add accessibility attributes
  const enhancedChildren = isValidElement(children) 
    ? cloneElement(children as React.ReactElement<any>, {
        id: `${inputId}-input`,
        'aria-invalid': !!errorMessage,
        'aria-describedby': [
          errorMessage ? errorId : null,
          helperText ? helperId : null
        ].filter(Boolean).join(' ') || undefined,
        'aria-required': required,
      })
    : children;

  return (
    <div className={fieldClass}>
      {label && (
        <label className="form-field-label" htmlFor={`${inputId}-input`}>
          {label}
          {required && (
            <span className="form-field-required" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      <div className="form-field-input">
        {enhancedChildren}
        {errorMessage && showErrorIcon && (
          <div className="form-field-error-icon" aria-hidden="true">
            ⚠️
          </div>
        )}
      </div>
      
      {errorMessage && (
        <div 
          id={errorId}
          className={`form-field-error-text form-field-error-text--${errorType || 'general'}`}
          role="alert"
          aria-live="polite"
        >
          <span className="form-field-error-icon-inline" aria-hidden="true">
            ❌
          </span>
          {errorMessage}
        </div>
      )}
      
      {helperText && !errorMessage && (
        <div id={helperId} className="form-field-helper-text">
          {helperText}
        </div>
      )}
    </div>
  );
};

export default FormField;