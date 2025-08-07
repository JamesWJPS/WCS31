import React, { useState } from 'react';
import { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import UserList from '../../components/users/UserList';
import UserForm from '../../components/users/UserForm';
import './UsersPage.css';

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Only administrators can access user management
  if (!currentUser || currentUser.role !== 'administrator') {
    return (
      <div className="users-page">
        <div className="access-denied">
          <h1>Access Denied</h1>
          <p>You do not have permission to access user management.</p>
        </div>
      </div>
    );
  }

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedUser(null);
  };

  const handleFormSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="users-page">
      <div className="users-page-header">
        <h1>User Management</h1>
        <p className="page-description">
          Manage system users, their roles, and access permissions. Only administrators can create, edit, or delete user accounts.
        </p>
      </div>

      <UserList
        onEditUser={handleEditUser}
        onCreateUser={handleCreateUser}
        refreshTrigger={refreshTrigger}
      />

      <UserForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        user={selectedUser}
      />
    </div>
  );
};

export default UsersPage;