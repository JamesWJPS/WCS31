import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { contentService } from '../../services/contentService';
import { userService } from '../../services/userService';
import './AdminDashboardPage.css';

interface DashboardStats {
  totalContent: number;
  publishedContent: number;
  draftContent: number;
  totalUsers: number;
  recentActivity: Array<{
    id: string;
    type: 'content' | 'user';
    action: string;
    title: string;
    timestamp: string;
  }>;
}

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalContent: 0,
    publishedContent: 0,
    draftContent: 0,
    totalUsers: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load content stats
      const contents = await contentService.getContentList();
      const publishedCount = contents.filter(c => c.status === 'published').length;
      const draftCount = contents.filter(c => c.status === 'draft').length;

      // Load user stats (only for administrators)
      let totalUsers = 0;
      if (user?.role === 'administrator') {
        const usersResponse = await userService.getUsers();
        totalUsers = usersResponse.data?.length || 0;
      }

      // Create recent activity (mock data for now)
      const recentActivity = contents
        .slice(0, 5)
        .map(content => ({
          id: content.id,
          type: 'content' as const,
          action: content.status === 'published' ? 'Published' : 'Updated',
          title: content.title,
          timestamp: content.updated_at || content.created_at
        }));

      setStats({
        totalContent: contents.length,
        publishedContent: publishedCount,
        draftContent: draftCount,
        totalUsers,
        recentActivity
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button 
            className="btn btn-outline-danger btn-sm ms-3"
            onClick={loadDashboardData}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-description">
          Welcome back, {user?.username}. Here's an overview of your content management system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="bi bi-file-text"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalContent}</h3>
            <p>Total Content</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon published">
            <i className="bi bi-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.publishedContent}</h3>
            <p>Published</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon draft">
            <i className="bi bi-pencil"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.draftContent}</h3>
            <p>Drafts</p>
          </div>
        </div>

        {user?.role === 'administrator' && (
          <div className="stat-card">
            <div className="stat-icon users">
              <i className="bi bi-people"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalUsers}</h3>
              <p>Users</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        {stats.recentActivity.length > 0 ? (
          <div className="activity-list">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  <i className={`bi ${activity.type === 'content' ? 'bi-file-text' : 'bi-person'}`}></i>
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    <strong>{activity.action}</strong> {activity.title}
                  </div>
                  <div className="activity-time">
                    {formatDate(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <i className="bi bi-clock-history"></i>
            <p>No recent activity</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <a href="/content/create" className="quick-action-card">
            <i className="bi bi-plus-circle"></i>
            <span>Create Content</span>
          </a>
          <a href="/content" className="quick-action-card">
            <i className="bi bi-list"></i>
            <span>Manage Content</span>
          </a>
          <a href="/documents" className="quick-action-card">
            <i className="bi bi-folder"></i>
            <span>File Manager</span>
          </a>
          {user?.role === 'administrator' && (
            <a href="/users" className="quick-action-card">
              <i className="bi bi-person-plus"></i>
              <span>Manage Users</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;