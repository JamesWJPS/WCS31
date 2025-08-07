import React from 'react';
import DocumentManagement from '../../components/documents/DocumentManagement';
import { useAuth } from '../../hooks/useAuth';
import './DocumentsPage.css';

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="documents-page__unauthorized">
        <h1>Access Denied</h1>
        <p>You must be logged in to access document management.</p>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <DocumentManagement />
    </div>
  );
};

export default DocumentsPage;