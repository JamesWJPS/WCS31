import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { sidebarOpen } = useApp();

  if (!sidebarOpen) {
    return null;
  }

  const canAccessUsers = user?.role === 'administrator';

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              📊 Dashboard
            </NavLink>
          </li>
          
          <li>
            <NavLink 
              to="/content" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              📝 Content
            </NavLink>
          </li>
          
          <li>
            <NavLink 
              to="/documents" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              📁 Documents
            </NavLink>
          </li>
          
          {canAccessUsers && (
            <li>
              <NavLink 
                to="/users" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                👥 Users
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;