import React, { useState, useEffect } from 'react';
import { User, UserFilter } from '../../types';
import { userService } from '../../services/userService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import './UserList.css';

interface UserListProps {
  onEditUser: (user: User) => void;
  onCreateUser: () => void;
  refreshTrigger?: number;
}

const UserList: React.FC<UserListProps> = ({ onEditUser, onCreateUser, refreshTrigger }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<UserFilter>({});

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getUsers(filter);
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error?.message || 'Failed to load users');
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filter, refreshTrigger]);

  const handleToggleActive = async (user: User) => {
    try {
      const response = user.isActive 
        ? await userService.deactivateUser(user.id)
        : await userService.activateUser(user.id);
      
      if (response.success) {
        loadUsers(); // Refresh the list
      } else {
        setError(response.error?.message || 'Failed to update user status');
      }
    } catch (err) {
      setError('Failed to update user status');
      console.error('Error updating user status:', err);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await userService.deleteUser(user.id);
      
      if (response.success) {
        loadUsers(); // Refresh the list
      } else {
        setError(response.error?.message || 'Failed to delete user');
      }
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'role-badge role-admin';
      case 'editor':
        return 'role-badge role-editor';
      case 'read-only':
        return 'role-badge role-readonly';
      default:
        return 'role-badge';
    }
  };

  if (loading) {
    return (
      <div className="user-list-loading">
        <LoadingSpinner />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-list">
      <div className="user-list-header">
        <div className="user-list-filters">
          <Input
            type="text"
            placeholder="Search users..."
            value={filter.search || ''}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="search-input"
          />
          <Select
            value={filter.role || ''}
            onChange={(e) => setFilter({ ...filter, role: e.target.value as any || undefined })}
            className="role-filter"
          >
            <option value="">All Roles</option>
            <option value="administrator">Administrator</option>
            <option value="editor">Editor</option>
            <option value="read-only">Read Only</option>
          </Select>
          <Select
            value={filter.isActive === undefined ? '' : filter.isActive.toString()}
            onChange={(e) => {
              const value = e.target.value;
              setFilter({ 
                ...filter, 
                isActive: value === '' ? undefined : value === 'true' 
              });
            }}
            className="status-filter"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
        <Button onClick={onCreateUser} variant="primary">
          Create User
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {users.length === 0 ? (
        <div className="no-users">
          <p>No users found matching your criteria.</p>
        </div>
      ) : (
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={!user.isActive ? 'inactive-user' : ''}>
                  <td className="username-cell">
                    <span className="username">{user.username}</span>
                  </td>
                  <td className="email-cell">{user.email}</td>
                  <td className="role-cell">
                    <span className={getRoleBadgeClass(user.role)}>
                      {user.role.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(user.createdAt)}</td>
                  <td className="date-cell">
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <Button
                        onClick={() => onEditUser(user)}
                        variant="secondary"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleToggleActive(user)}
                        variant={user.isActive ? 'danger' : 'ghost'}
                        size="sm"
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(user)}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserList;