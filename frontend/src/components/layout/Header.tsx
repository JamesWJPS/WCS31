import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useApp();

  const handleLogout = (): void => {
    logout();
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <h1 className="header-title">Web Communication CMS</h1>
      </div>
      
      <div className="header-right">
        {user && (
          <div className="user-info">
            <span className="user-name">{user.username}</span>
            <span className="user-role">({user.role})</span>
            <button 
              className="logout-button"
              onClick={handleLogout}
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;