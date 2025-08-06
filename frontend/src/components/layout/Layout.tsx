import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useApp } from '../../contexts/AppContext';
import './Layout.css';

const Layout: React.FC = () => {
  const { sidebarOpen } = useApp();

  return (
    <div className="layout">
      <Header />
      <div className="layout-content">
        <Sidebar />
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;