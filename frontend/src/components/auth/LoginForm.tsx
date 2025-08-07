import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import './LoginForm.css';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      return;
    }

    try {
      await login(username.trim(), password);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleInputChange = () => {
    if (error) {
      clearError();
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-form__header">
        <h1>Web Communication CMS</h1>
        <p>Sign in to manage your council's website</p>
      </div>

      {error && (
        <div className="login-form__error" role="alert" aria-live="polite">
          <span className="login-form__error-icon" aria-hidden="true">⚠</span>
          {error}
        </div>
      )}

      <div className="login-form__fields">
        <div className="login-form__field">
          <label htmlFor="username" className="login-form__label">
            Username
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              handleInputChange();
            }}
            placeholder="Enter your username"
            required
            autoComplete="username"
            disabled={isLoading}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        <div className="login-form__field">
          <label htmlFor="password" className="login-form__label">
            Password
          </label>
          <div className="login-form__password-field">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                handleInputChange();
              }}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isLoading}
              aria-describedby={error ? 'login-error' : undefined}
            />
            <button
              type="button"
              className="login-form__password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
      </div>

      <div className="login-form__actions">
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || !username.trim() || !password.trim()}
          className="login-form__submit"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;