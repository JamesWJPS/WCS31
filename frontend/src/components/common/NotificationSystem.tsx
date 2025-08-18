import React, { useState, useEffect, useCallback } from 'react';
import { NotificationState, NotificationAction } from '../../types';
import './NotificationSystem.css';

interface NotificationSystemProps {
  notifications: NotificationState[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onDismiss,
  maxVisible = 5,
  position = 'top-right'
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationState[]>([]);

  // Update visible notifications when notifications change
  useEffect(() => {
    const sortedNotifications = [...notifications]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxVisible);
    
    setVisibleNotifications(sortedNotifications);
  }, [notifications, maxVisible]);

  // Auto-dismiss notifications with duration
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    visibleNotifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          onDismiss(notification.id);
        }, notification.duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [visibleNotifications, onDismiss]);

  const getNotificationIcon = (type: NotificationState['type']) => {
    switch (type) {
      case 'success':
        return 'bi-check-circle';
      case 'error':
        return 'bi-exclamation-triangle';
      case 'warning':
        return 'bi-exclamation-circle';
      case 'info':
        return 'bi-info-circle';
      default:
        return 'bi-info-circle';
    }
  };

  const handleActionClick = (action: NotificationAction, notificationId: string) => {
    action.action();
    if (action.variant !== 'secondary') {
      onDismiss(notificationId);
    }
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={`notification-system notification-system-${position}`}>
      {visibleNotifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          role="alert"
          aria-live="polite"
        >
          <div className="notification-content">
            <div className="notification-header">
              <div className="notification-icon">
                <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
              </div>
              <div className="notification-text">
                <h6 className="notification-title">{notification.title}</h6>
                <p className="notification-message">{notification.message}</p>
              </div>
              <button
                className="notification-close"
                onClick={() => onDismiss(notification.id)}
                aria-label="Dismiss notification"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="notification-actions">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    className={`notification-action-btn ${action.variant || 'primary'}`}
                    onClick={() => handleActionClick(action, notification.id)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {notification.duration && notification.duration > 0 && (
            <div 
              className="notification-progress"
              style={{
                animationDuration: `${notification.duration}ms`
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;