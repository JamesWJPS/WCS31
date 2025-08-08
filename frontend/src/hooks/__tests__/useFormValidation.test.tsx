import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, ValidationRule } from '../useFormValidation';

interface TestFormData {
  email: string;
  password: string;
  confirmPassword: string;
  age: number;
  website: string;
  file: File | null;
}

describe('useFormValidation', () => {
  const initialValues: TestFormData = {
    email: '',
    password: '',
    confirmPassword: '',
    age: 0,
    website: '',
    file: null,
  };

  const validationRules: Partial<Record<keyof TestFormData, ValidationRule>> = {
    email: {
      required: true,
      email: true,
    },
    password: {
      required: true,
      minLength: 8,
    },
    confirmPassword: {
      required: true,
      custom: (value: string) => {
        // This would normally access the password field from the form
        return value !== 'password123' ? 'Passwords do not match' : null;
      },
    },
    age: {
      required: true,
      numeric: true,
      min: 18,
      max: 120,
    },
    website: {
      url: true,
    },
    file: {
      fileSize: 5 * 1024 * 1024, // 5MB
      fileTypes: ['image/jpeg', 'image/png'],
    },
  };

  it('initializes with correct default values', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialValues,
        validationRules,
      })
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  describe('Field Validation', () => {
    it('validates required fields', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      await act(async () => {
        const isValid = await result.current.validateField('email');
        expect(isValid).toBe(false);
        expect(result.current.errors.email?.message).toBe('email is required');
        expect(result.current.errors.email?.type).toBe('required');
      });
    });

    it('validates email format', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      act(() => {
        result.current.setValue('email', 'invalid-email');
      });

      await act(async () => {
        const isValid = await result.current.validateField('email');
        expect(isValid).toBe(false);
        expect(result.current.errors.email?.message).toBe('Please enter a valid email address');
        expect(result.current.errors.email?.type).toBe('email');
      });
    });

    it('validates minimum length', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      act(() => {
        result.current.setValue('password', '123');
      });

      await act(async () => {
        const isValid = await result.current.validateField('password');
        expect(isValid).toBe(false);
        expect(result.current.errors.password?.message).toBe('password must be at least 8 characters');
        expect(result.current.errors.password?.type).toBe('minLength');
      });
    });

    it('validates numeric fields', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      act(() => {
        result.current.setValue('age', 'not-a-number' as any);
      });

      await act(async () => {
        const isValid = await result.current.validateField('age');
        expect(isValid).toBe(false);
        expect(result.current.errors.age?.message).toBe('age must be a number');
        expect(result.current.errors.age?.type).toBe('numeric');
      });
    });

    it('validates minimum and maximum values', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      // Test minimum
      act(() => {
        result.current.setValue('age', 15);
      });

      await act(async () => {
        const isValid = await result.current.validateField('age');
        expect(isValid).toBe(false);
        expect(result.current.errors.age?.message).toBe('age must be at least 18');
        expect(result.current.errors.age?.type).toBe('min');
      });

      // Test maximum
      act(() => {
        result.current.setValue('age', 150);
      });

      await act(async () => {
        const isValid = await result.current.validateField('age');
        expect(isValid).toBe(false);
        expect(result.current.errors.age?.message).toBe('age must be no more than 120');
        expect(result.current.errors.age?.type).toBe('max');
      });
    });

    it('validates URL format', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      act(() => {
        result.current.setValue('website', 'not-a-url');
      });

      await act(async () => {
        const isValid = await result.current.validateField('website');
        expect(isValid).toBe(false);
        expect(result.current.errors.website?.message).toBe('Please enter a valid URL');
        expect(result.current.errors.website?.type).toBe('url');
      });
    });

    it('validates custom rules', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      act(() => {
        result.current.setValue('confirmPassword', 'wrong-password');
      });

      await act(async () => {
        const isValid = await result.current.validateField('confirmPassword');
        expect(isValid).toBe(false);
        expect(result.current.errors.confirmPassword?.message).toBe('Passwords do not match');
        expect(result.current.errors.confirmPassword?.type).toBe('custom');
      });
    });

    it('validates file size', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      // Create a mock file that's too large
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      act(() => {
        result.current.setValue('file', largeFile);
      });

      await act(async () => {
        const isValid = await result.current.validateField('file');
        expect(isValid).toBe(false);
        expect(result.current.errors.file?.message).toContain('File size must be less than');
        expect(result.current.errors.file?.type).toBe('fileSize');
      });
    });

    it('validates file types', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      // Create a file with wrong type
      const wrongTypeFile = new File(['content'], 'document.pdf', {
        type: 'application/pdf',
      });

      act(() => {
        result.current.setValue('file', wrongTypeFile);
      });

      await act(async () => {
        const isValid = await result.current.validateField('file');
        expect(isValid).toBe(false);
        expect(result.current.errors.file?.message).toContain('File type must be one of');
        expect(result.current.errors.file?.type).toBe('fileTypes');
      });
    });
  });

  describe('Form Validation', () => {
    it('validates entire form', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      await act(async () => {
        const isValid = await result.current.validateForm();
        expect(isValid).toBe(false);
        expect(Object.keys(result.current.errors)).toContain('email');
        expect(Object.keys(result.current.errors)).toContain('password');
        expect(Object.keys(result.current.errors)).toContain('age');
      });
    });

    it('returns true when form is valid', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      act(() => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
        result.current.setValue('confirmPassword', 'password123');
        result.current.setValue('age', 25);
        result.current.setValue('website', 'https://example.com');
      });

      await act(async () => {
        const isValid = await result.current.validateForm();
        expect(isValid).toBe(true);
        expect(result.current.isValid).toBe(true);
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit when form is valid', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
          onSubmit,
        })
      );

      // Set valid values
      act(() => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
        result.current.setValue('confirmPassword', 'password123');
        result.current.setValue('age', 25);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        age: 25,
        website: '',
        file: null,
      });
    });

    it('does not call onSubmit when form is invalid', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('sets isSubmitting during submission', async () => {
      const onSubmit = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
          onSubmit,
        })
      );

      // Set valid values
      act(() => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
        result.current.setValue('confirmPassword', 'password123');
        result.current.setValue('age', 25);
      });

      act(() => {
        result.current.handleSubmit();
      });

      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('Field Props', () => {
    it('returns correct field props', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      const fieldProps = result.current.getFieldProps('email');

      expect(fieldProps).toMatchObject({
        value: '',
        onChange: expect.any(Function),
        onBlur: expect.any(Function),
        'aria-invalid': false,
        'aria-describedby': 'email-error',
      });
    });

    it('updates aria-invalid when field has error', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      await act(async () => {
        await result.current.validateField('email');
      });

      const fieldProps = result.current.getFieldProps('email');
      expect(fieldProps['aria-invalid']).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('resets form to initial values', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      act(() => {
        result.current.setValue('email', 'test@example.com');
        result.current.setError('email', { message: 'Error', type: 'custom', field: 'email' });
        result.current.setTouched('email', true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isDirty).toBe(false);
    });

    it('resets form to new values', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
        })
      );

      const newValues = { ...initialValues, email: 'new@example.com' };

      act(() => {
        result.current.reset(newValues);
      });

      expect(result.current.values).toEqual(newValues);
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('Validation Options', () => {
    it('validates on change when enabled', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.setValue('email', 'invalid');
      });

      // Wait for debounced validation
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });

      expect(result.current.errors.email?.type).toBe('email');
    });

    it('does not validate on change when disabled', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          validationRules,
          validateOnChange: false,
        })
      );

      act(() => {
        result.current.setValue('email', 'invalid');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });

      expect(result.current.errors.email).toBeUndefined();
    });
  });
});