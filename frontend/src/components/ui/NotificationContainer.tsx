import React from 'react';
import { useNotifications, Notification } from '../../contexts/NotificationContext';
import Button from './Button';
import './NotificationContainer.css';

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const handleClose = () => {
    onRemove(notification.id);
  };

  return (
    <div 
      className={`notification notification--${notification.type}`}
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="notification-content">
        <div className="notification-icon" aria-hidden="true">
          {getIcon()}
        </div>
        
        <div className="notification-body">
          <div className="notification-title">
            {notification.title}
          </div>
          
          {notification.message && (
            <div className="notification-message">
              {notification.message}
            </div>
          )}
          
          {notification.actions && notification.actions.length > 0 && (
            <div className="notification-actions">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  size="small"
                  variant={action.variant || 'secondary'}
                  onClick={action.action}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <button
          className="notification-close"
          onClick={handleClose}
          aria-label={`Close ${notification.title} notification`}
          type="button"
        >
          ×
        </button>
      </div>
      
      {!notification.persistent && (
        <div 
          className="notification-progress"
          style={{
            animationDuration: `${notification.duration || 5000}ms`
          }}
        />
      )}
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification, clearAll } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container" aria-label="Notifications">
      {notifications.length > 3 && (
        <div className="notification-header">
          <span className="notification-count">
            {notifications.length} notifications
          </span>
          <Button
            size="small"
            variant="outline"
            onClick={clearAll}
          >
            Clear All
          </Button>
        </div>
      )}
      
      <div className="notification-list">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationContainer;