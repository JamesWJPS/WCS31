import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AdminLayout.css';

const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navigationItems = [
    {
      path: '/dashboard',
      icon: 'bi-speedometer2',
      label: 'Dashboard',
      description: 'Overview and analytics'
    },
    {
      path: '/content',
      icon: 'bi-file-text',
      label: 'Content',
      description: 'Manage pages and content'
    },
    {
      path: '/documents',
      icon: 'bi-folder',
      label: 'Documents',
      description: 'File management'
    },
    {
      path: '/users',
      icon: 'bi-people',
      label: 'Users',
      description: 'User management',
      adminOnly: true
    },
    {
      path: '/preview',
      icon: 'bi-eye',
      label: 'View Site',
      description: 'Preview public site'
    }
  ];

  const filteredNavItems = navigationItems.filter(item => 
    !item.adminOnly || user?.role === 'administrator'
  );

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h5 className="mb-0">
            <i className="bi bi-gear-fill me-2"></i>
            Admin Panel
          </h5>
          <small className="text-muted">Welcome, {user?.username}</small>
        </div>
        
        <nav className="admin-nav">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `admin-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <div className="nav-item-content">
                <div className="nav-item-main">
                  <i className={`bi ${item.icon} me-3`}></i>
                  <span className="nav-item-label">{item.label}</span>
                </div>
                <small className="nav-item-description">{item.description}</small>
              </div>
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;