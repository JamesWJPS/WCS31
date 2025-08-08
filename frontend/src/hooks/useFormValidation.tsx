import { useState, useCallback, useRef, useEffect } from 'react';

export interface ValidationRule<T = any> {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  custom?: (value: T) => string | null | Promise<string | null>;
  email?: boolean | string;
  url?: boolean | string;
  numeric?: boolean | string;
  integer?: boolean | string;
  positive?: boolean | string;
  fileSize?: number | { value: number; message: string };
  fileTypes?: string[] | { value: string[]; message: string };
}

export interface FieldError {
  message: string;
  type: string;
  field: string;
}

export interface FormState<T> {
  values: T;
  errors: Record<keyof T, FieldError | null>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface UseFormValidationOptions<T> {
  initialValues: T;
  validationRules?: Partial<Record<keyof T, ValidationRule>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  onSubmit?: (values: T) => Promise<void> | void;
  onError?: (errors: Record<keyof T, FieldError | null>) => void;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: Record<keyof T, FieldError | null>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  setValue: (field: keyof T, value: any) => void;
  setError: (field: keyof T, error: FieldError | null) => void;
  setTouched: (field: keyof T, touched: boolean) => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (newValues?: T) => void;
  clearErrors: () => void;
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    'aria-invalid': boolean;
    'aria-describedby': string;
  };
  getFieldError: (field: keyof T) => FieldError | null;
  hasFieldError: (field: keyof T) => boolean;
}

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules = {},
  validateOnChange = true,
  validateOnBlur = true,
  validateOnSubmit = true,
  onSubmit,
  onError,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, FieldError | null>>({} as Record<keyof T, FieldError | null>);
  const [touched, setTouchedState] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialValuesRef = useRef(initialValues);
  const validationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Calculate derived state
  const isValid = Object.values(errors).every(error => error === null);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);

  // Validation functions
  const validateValue = useCallback(async (field: keyof T, value: any): Promise<FieldError | null> => {
    const rules = validationRules[field];
    if (!rules) return null;

    // Required validation
    if (rules.required) {
      const isEmpty = value === null || value === undefined || value === '' || 
                     (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        const message = typeof rules.required === 'string' 
          ? rules.required 
          : `${String(field)} is required`;
        return { message, type: 'required', field: String(field) };
      }
    }

    // Skip other validations if value is empty and not required
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // String validations
    if (typeof value === 'string') {
      // Email validation
      if (rules.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          const message = typeof rules.email === 'string' 
            ? rules.email 
            : 'Please enter a valid email address';
          return { message, type: 'email', field: String(field) };
        }
      }

      // URL validation
      if (rules.url) {
        try {
          new URL(value);
        } catch {
          const message = typeof rules.url === 'string' 
            ? rules.url 
            : 'Please enter a valid URL';
          return { message, type: 'url', field: String(field) };
        }
      }

      // Min length validation
      if (rules.minLength) {
        const minLength = typeof rules.minLength === 'number' 
          ? rules.minLength 
          : rules.minLength.value;
        
        if (value.length < minLength) {
          const message = typeof rules.minLength === 'object' 
            ? rules.minLength.message 
            : `${String(field)} must be at least ${minLength} characters`;
          return { message, type: 'minLength', field: String(field) };
        }
      }

      // Max length validation
      if (rules.maxLength) {
        const maxLength = typeof rules.maxLength === 'number' 
          ? rules.maxLength 
          : rules.maxLength.value;
        
        if (value.length > maxLength) {
          const message = typeof rules.maxLength === 'object' 
            ? rules.maxLength.message 
            : `${String(field)} must be no more than ${maxLength} characters`;
          return { message, type: 'maxLength', field: String(field) };
        }
      }

      // Pattern validation
      if (rules.pattern) {
        const pattern = typeof rules.pattern === 'object' && 'value' in rules.pattern
          ? rules.pattern.value 
          : rules.pattern as RegExp;
        
        if (!pattern.test(value)) {
          const message = typeof rules.pattern === 'object' && 'message' in rules.pattern
            ? rules.pattern.message 
            : `${String(field)} format is invalid`;
          return { message, type: 'pattern', field: String(field) };
        }
      }
    }

    // Numeric validations
    if (rules.numeric || rules.integer || rules.positive || rules.min !== undefined || rules.max !== undefined) {
      const numValue = Number(value);
      
      if (rules.numeric && isNaN(numValue)) {
        const message = typeof rules.numeric === 'string' 
          ? rules.numeric 
          : `${String(field)} must be a number`;
        return { message, type: 'numeric', field: String(field) };
      }

      if (rules.integer && !Number.isInteger(numValue)) {
        const message = typeof rules.integer === 'string' 
          ? rules.integer 
          : `${String(field)} must be a whole number`;
        return { message, type: 'integer', field: String(field) };
      }

      if (rules.positive && numValue <= 0) {
        const message = typeof rules.positive === 'string' 
          ? rules.positive 
          : `${String(field)} must be a positive number`;
        return { message, type: 'positive', field: String(field) };
      }

      if (rules.min !== undefined) {
        const min = typeof rules.min === 'number' ? rules.min : rules.min.value;
        if (numValue < min) {
          const message = typeof rules.min === 'object' 
            ? rules.min.message 
            : `${String(field)} must be at least ${min}`;
          return { message, type: 'min', field: String(field) };
        }
      }

      if (rules.max !== undefined) {
        const max = typeof rules.max === 'number' ? rules.max : rules.max.value;
        if (numValue > max) {
          const message = typeof rules.max === 'object' 
            ? rules.max.message 
            : `${String(field)} must be no more than ${max}`;
          return { message, type: 'max', field: String(field) };
        }
      }
    }

    // File validations
    if (value instanceof File || value instanceof FileList) {
      const file = value instanceof FileList ? value[0] : value;
      
      if (file && rules.fileSize) {
        const maxSize = typeof rules.fileSize === 'number' 
          ? rules.fileSize 
          : rules.fileSize.value;
        
        if (file.size > maxSize) {
          const message = typeof rules.fileSize === 'object' 
            ? rules.fileSize.message 
            : `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
          return { message, type: 'fileSize', field: String(field) };
        }
      }

      if (file && rules.fileTypes) {
        const allowedTypes = typeof rules.fileTypes === 'object' && 'value' in rules.fileTypes
          ? rules.fileTypes.value 
          : rules.fileTypes as string[];
        
        const fileType = file.type || '';
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        
        const isAllowed = allowedTypes.some(type => 
          fileType.includes(type) || fileExtension === type.replace('.', '')
        );
        
        if (!isAllowed) {
          const message = typeof rules.fileTypes === 'object' && 'message' in rules.fileTypes
            ? rules.fileTypes.message 
            : `File type must be one of: ${allowedTypes.join(', ')}`;
          return { message, type: 'fileTypes', field: String(field) };
        }
      }
    }

    // Custom validation
    if (rules.custom) {
      try {
        const customError = await rules.custom(value);
        if (customError) {
          return { message: customError, type: 'custom', field: String(field) };
        }
      } catch (error) {
        return { 
          message: 'Validation error occurred', 
          type: 'custom', 
          field: String(field) 
        };
      }
    }

    return null;
  }, [validationRules]);

  const validateField = useCallback(async (field: keyof T): Promise<boolean> => {
    const error = await validateValue(field, values[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
    return error === null;
  }, [values, validateValue]);

  const validateForm = useCallback(async (): Promise<boolean> => {
    const newErrors: Record<keyof T, FieldError | null> = {} as Record<keyof T, FieldError | null>;
    
    const validationPromises = Object.keys(values).map(async (field) => {
      const error = await validateValue(field as keyof T, values[field as keyof T]);
      newErrors[field as keyof T] = error;
    });

    await Promise.all(validationPromises);
    setErrors(newErrors);

    const isFormValid = Object.values(newErrors).every(error => error === null);
    
    if (!isFormValid && onError) {
      onError(newErrors);
    }

    return isFormValid;
  }, [values, validateValue, onError]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));

    // Debounced validation on change
    if (validateOnChange) {
      if (validationTimeouts.current[String(field)]) {
        clearTimeout(validationTimeouts.current[String(field)]);
      }

      validationTimeouts.current[String(field)] = setTimeout(() => {
        validateField(field);
      }, 300);
    }
  }, [validateOnChange, validateField]);

  const setError = useCallback((field: keyof T, error: FieldError | null) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const setTouched = useCallback((field: keyof T, isTouched: boolean) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setIsSubmitting(true);

    try {
      let isFormValid = true;

      if (validateOnSubmit) {
        isFormValid = await validateForm();
      }

      if (isFormValid && onSubmit) {
        await onSubmit(values);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateOnSubmit, validateForm, onSubmit]);

  const reset = useCallback((newValues?: T) => {
    const resetValues = newValues || initialValues;
    setValues(resetValues);
    setErrors({} as Record<keyof T, FieldError | null>);
    setTouchedState({} as Record<keyof T, boolean>);
    setIsSubmitting(false);
    initialValuesRef.current = resetValues;
  }, [initialValues]);

  const clearErrors = useCallback(() => {
    setErrors({} as Record<keyof T, FieldError | null>);
  }, []);

  const getFieldProps = useCallback((field: keyof T) => {
    return {
      value: values[field] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked
          : e.target.type === 'file'
          ? (e.target as HTMLInputElement).files
          : e.target.value;
        
        setValue(field, value);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setTouched(field, true);
        if (validateOnBlur) {
          validateField(field);
        }
      },
      'aria-invalid': errors[field] !== null,
      'aria-describedby': `${String(field)}-error`,
    };
  }, [values, errors, setValue, setTouched, validateOnBlur, validateField]);

  const getFieldError = useCallback((field: keyof T): FieldError | null => {
    return errors[field] || null;
  }, [errors]);

  const hasFieldError = useCallback((field: keyof T): boolean => {
    return errors[field] !== null && touched[field] === true;
  }, [errors, touched]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(validationTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    setError,
    setTouched,
    validateField,
    validateForm,
    handleSubmit,
    reset,
    clearErrors,
    getFieldProps,
    getFieldError,
    hasFieldError,
  };
}