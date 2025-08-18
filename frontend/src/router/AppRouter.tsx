import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout';
import AdminDashboardPage from '../pages/dashboard/AdminDashboardPage';
import ContentPage from '../pages/content/ContentPage';
import DocumentsPage from '../pages/documents/DocumentsPage';
import UsersPage from '../pages/users/UsersPage';
import SitePreviewPage from '../pages/preview/SitePreviewPage';
import PublicContentPage from '../pages/public/PublicContentPage';
import NotFoundPage from '../pages/NotFoundPage';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Admin routes with layout - keeping original paths */}
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="preview" element={<SitePreviewPage />} />
      </Route>
      
      {/* Public content routes - using /public prefix to avoid conflicts */}
      <Route path="/public" element={<PublicContentPage />} />
      <Route path="/public/:slug" element={<PublicContentPage />} />
      
      {/* 404 route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;