import React, { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppRouter from './router/AppRouter';
import ErrorBoundary from './components/ui/ErrorBoundary';
import NotificationContainer from './components/ui/NotificationContainer';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import './styles/globals.css';

// Network status component to handle global network events
const NetworkStatusHandler: React.FC = () => {
  const networkStatus = useNetworkStatus({
    checkInterval: 30000,
    showNotifications: true,
  });

  useEffect(() => {
    // Handle auth errors globally
    const handleAuthError = (event: CustomEvent) => {
      console.log('Global auth error:', event.detail);
      // Additional global auth error handling can be added here
    };

    window.addEventListener('auth:error', handleAuthError as EventListener);

    return () => {
      window.removeEventListener('auth:error', handleAuthError as EventListener);
    };
  }, []);

  return null;
};

function App(): JSX.Element {
  return (
    <ErrorBoundary 
      level="global"
      onError={(error, errorInfo) => {
        // Global error reporting
        console.error('Global application error:', error, errorInfo);
        
        // In production, send to error monitoring service
        if (process.env.NODE_ENV === 'production') {
          // TODO: Send to error monitoring service
          // errorMonitoringService.captureError(error, errorInfo);
        }
      }}
    >
      <NotificationProvider maxNotifications={5}>
        <AuthProvider>
          <AppProvider>
            <NetworkStatusHandler />
            <ErrorBoundary level="route">
              <AppRouter />
            </ErrorBoundary>
            <NotificationContainer />
          </AppProvider>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;