import React, { FormHTMLAttributes, ReactNode } from 'react';
import './Form.css';

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  title?: string;
  description?: string;
  error?: string;
  loading?: boolean;
}

const Form: React.FC<FormProps> = ({
  children,
  title,
  description,
  error,
  loading = false,
  className = '',
  ...props
}) => {
  const formClass = [
    'form',
    loading ? 'form-loading' : '',
    className
  ].filter(Boolean).join(' ');

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
      
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      
      <div className="form-content">
        {children}
      </div>
      
      {loading && (
        <div className="form-loading-overlay" aria-hidden="true">
          <div className="form-spinner" />
        </div>
      )}
    </form>
  );
};

export default Form;