import React, { FormHTMLAttributes, ReactNode } from 'react';
import { FieldError } from '../../hooks/useFormValidation';
import './Form.css';

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  title?: string;
  description?: string;
  error?: string;
  errors?: Record<string, FieldError | null>;
  loading?: boolean;
  showErrorSummary?: boolean;
}

const Form: React.FC<FormProps> = ({
  children,
  title,
  description,
  error,
  errors,
  loading = false,
  showErrorSummary = true,
  className = '',
  ...props
}) => {
  const formClass = [
    'form',
    loading ? 'form-loading' : '',
    className
  ].filter(Boolean).join(' ');

  // Get all field errors for summary
  const fieldErrors = errors ? Object.values(errors).filter(Boolean) : [];
  const hasErrors = error || fieldErrors.length > 0;

  return (
    <form className={formClass} {...props}>
      {title && (
        <div className="form-header">
          <h2 className="form-title">{title}</h2>
          {description && (
            <p className="form-description">{description}</p>
          )}
        </div>
      )}
      
      {hasErrors && showErrorSummary && (
        <div className="form-error-summary" role="alert" aria-labelledby="error-summary-title">
          <h3 id="error-summary-title" className="form-error-summary-title">
            {fieldErrors.length > 1 ? 'Please correct the following errors:' : 'Please correct the following error:'}
          </h3>
          
          {error && (
            <div className="form-error-summary-item">
              <span className="form-error-summary-icon" aria-hidden="true">•</span>
              {error}
            </div>
          )}
          
          {fieldErrors.map((fieldError, index) => (
            <div key={index} className="form-error-summary-item">
              <span className="form-error-summary-icon" aria-hidden="true">•</span>
              <a 
                href={`#${fieldError!.field}-input`}
                className="form-error-summary-link"
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(`${fieldError!.field}-input`);
                  if (element) {
                    element.focus();
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              >
                {fieldError!.message}
              </a>
            </div>
          ))}
        </div>
      )}
      
      <div className="form-content">
        {children}
      </div>
      
      {loading && (
        <div className="form-loading-overlay" aria-hidden="true">
          <div className="form-spinner" />
          <span className="sr-only">Loading...</span>
        </div>
      )}
    </form>
  );
};

export default Form;