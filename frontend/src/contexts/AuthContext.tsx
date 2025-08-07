import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'administrator' | 'editor' | 'read-only';
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: authService.getStoredToken(),
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check existing token
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount and validate it
  useEffect(() => {
    const initializeAuth = async () => {
      const token = authService.getStoredToken();
      
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Check if token is expired
      if (authService.isTokenExpired(token)) {
        authService.removeStoredToken();
        dispatch({ type: 'LOGOUT' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      try {
        // Validate token with backend and get user info
        const userProfile = await authService.getProfile();
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { 
            user: {
              id: userProfile.id,
              username: userProfile.username,
              email: userProfile.email,
              role: userProfile.role,
              isActive: userProfile.isActive,
            }, 
            token 
          } 
        });
      } catch (error) {
        // Token is invalid, remove it
        authService.removeStoredToken();
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await authService.login({ username, password });
      
      // Store token
      authService.setStoredToken(response.token);
      
      // Update state
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { 
          user: response.user, 
          token: response.token 
        } 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      authService.removeStoredToken();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the context for use in custom hooks
export { AuthContext };