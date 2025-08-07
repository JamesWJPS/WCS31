import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ContentList, ContentEditor } from '../../components/content';
import './ContentPage.css';

const ContentPage: React.FC = () => {
  return (
    <div className="content-page">
      <Routes>
        <Route index element={<ContentList />} />
        <Route path="create" element={<ContentEditor mode="create" />} />
        <Route path="edit/:id" element={<ContentEditor mode="edit" />} />
        <Route path="view/:id" element={<ContentView />} />
      </Routes>
    </div>
  );
};

// Simple content view component for viewing published content
const ContentView: React.FC = () => {
  return (
    <div className="content-view">
      <h1>Content View</h1>
      <p>Content viewing interface - to be implemented in future tasks</p>
    </div>
  );
};

export default ContentPage;