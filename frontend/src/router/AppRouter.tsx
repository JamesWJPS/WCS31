import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ContentPage from '../pages/content/ContentPage';
import DocumentsPage from '../pages/documents/DocumentsPage';
import UsersPage from '../pages/users/UsersPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from '../components/auth/ProtectedRoute';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        
        {/* 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;