import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from '../../components/auth/LoginForm';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-page__loading">
          <div className="login-page__spinner" aria-label="Loading..."></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="login-page">
      <div className="login-page__container">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;