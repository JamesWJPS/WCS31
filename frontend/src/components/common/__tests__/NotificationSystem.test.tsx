import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import NotificationSystem from '../NotificationSystem';
import { NotificationState } from '../../../types';

// Mock notifications
const mockNotifications: NotificationState[] = [
  {
    id: '1',
    type: 'success',
    title: 'Success',
    message: 'Operation completed successfully',
    timestamp: new Date(),
    duration: 5000
  },
  {
    id: '2',
    type: 'error',
    title: 'Error',
    message: 'Something went wrong',
    timestamp: new Date(),
    duration: 0, // No auto-dismiss
    actions: [
      {
        label: 'Retry',
        action: vi.fn(),
        variant: 'primary'
      }
    ]
  },
  {
    id: '3',
    type: 'warning',
    title: 'Warning',
    message: 'Please check your input',
    timestamp: new Date(),
    duration: 8000
  },
  {
    id: '4',
    type: 'info',
    title: 'Info',
    message: 'Here is some information',
    timestamp: new Date(),
    duration: 5000
  }
];

describe('NotificationSystem', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders notifications correctly', () => {
    render(
      <NotificationSystem
        notifications={mockNotifications}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('limits visible notifications based on maxVisible prop', () => {
    render(
      <NotificationSystem
        notifications={mockNotifications}
        onDismiss={mockOnDismiss}
        maxVisible={2}
      />
    );

    // Should only show the 2 most recent notifications
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText('Warning')).not.toBeInTheDocument();
    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });

  it('shows correct icons for different notification types', () => {
    render(
      <NotificationSystem
        notifications={mockNotifications}
        onDismiss={mockOnDismiss}
      />
    );

    expect(document.querySelector('.bi-check-circle')).toBeInTheDocument(); // success
    expect(document.querySelector('.bi-exclamation-triangle')).toBeInTheDocument(); // error
    expect(document.querySelector('.bi-exclamation-circle')).toBeInTheDocument(); // warning
    expect(document.querySelector('.bi-info-circle')).toBeInTheDocument(); // info
  });

  it('calls onDismiss when close button is clicked', () => {
    render(
      <NotificationSystem
        notifications={[mockNotifications[0]]}
        onDismiss={mockOnDismiss}
      />
    );

    const closeButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('1');
  });

  it('renders action buttons correctly', () => {
    render(
      <NotificationSystem
        notifications={[mockNotifications[1]]} // Error notification with retry action
        onDismiss={mockOnDismiss}
      />
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toHaveClass('primary');
  });

  it('calls action callback when action button is clicked', () => {
    const mockAction = vi.fn();
    const notificationWithAction: NotificationState = {
      ...mockNotifications[1],
      actions: [
        {
          label: 'Retry',
          action: mockAction,
          variant: 'primary'
        }
      ]
    };

    render(
      <NotificationSystem
        notifications={[notificationWithAction]}
        onDismiss={mockOnDismiss}
      />
    );

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockOnDismiss).toHaveBeenCalledWith(notificationWithAction.id);
  });

  it('does not auto-dismiss when action is secondary', () => {
    const mockAction = vi.fn();
    const notificationWithSecondaryAction: NotificationState = {
      ...mockNotifications[1],
      actions: [
        {
          label: 'Details',
          action: mockAction,
          variant: 'secondary'
        }
      ]
    };

    render(
      <NotificationSystem
        notifications={[notificationWithSecondaryAction]}
        onDismiss={mockOnDismiss}
      />
    );

    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);

    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('auto-dismisses notifications with duration', async () => {
    render(
      <NotificationSystem
        notifications={[mockNotifications[0]]} // Success notification with 5000ms duration
        onDismiss={mockOnDismiss}
      />
    );

    // Fast-forward time by 5000ms
    vi.advanceTimersByTime(5000);

    // Run all pending timers
    await vi.runAllTimersAsync();

    expect(mockOnDismiss).toHaveBeenCalledWith('1');
  });

  it('does not auto-dismiss notifications with duration 0', async () => {
    render(
      <NotificationSystem
        notifications={[mockNotifications[1]]} // Error notification with duration 0
        onDismiss={mockOnDismiss}
      />
    );

    // Fast-forward time by 10000ms
    vi.advanceTimersByTime(10000);

    // Run all pending timers
    await vi.runAllTimersAsync();

    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('shows progress bar for notifications with duration', () => {
    render(
      <NotificationSystem
        notifications={[mockNotifications[0]]}
        onDismiss={mockOnDismiss}
      />
    );

    const progressBar = document.querySelector('.notification-progress');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('animation-duration: 5000ms');
  });

  it('does not show progress bar for notifications without duration', () => {
    render(
      <NotificationSystem
        notifications={[mockNotifications[1]]} // Error notification with duration 0
        onDismiss={mockOnDismiss}
      />
    );

    const progressBar = document.querySelector('.notification-progress');
    expect(progressBar).not.toBeInTheDocument();
  });

  it('applies correct positioning classes', () => {
    const { rerender } = render(
      <NotificationSystem
        notifications={[mockNotifications[0]]}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    expect(document.querySelector('.notification-system-top-right')).toBeInTheDocument();

    rerender(
      <NotificationSystem
        notifications={[mockNotifications[0]]}
        onDismiss={mockOnDismiss}
        position="bottom-left"
      />
    );

    expect(document.querySelector('.notification-system-bottom-left')).toBeInTheDocument();
  });

  it('renders nothing when no notifications are provided', () => {
    const { container } = render(
      <NotificationSystem
        notifications={[]}
        onDismiss={mockOnDismiss}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('has proper accessibility attributes', () => {
    render(
      <NotificationSystem
        notifications={[mockNotifications[0]]}
        onDismiss={mockOnDismiss}
      />
    );

    const notification = screen.getByRole('alert');
    expect(notification).toHaveAttribute('aria-live', 'polite');
  });

  it('sorts notifications by timestamp (newest first)', () => {
    const oldNotification: NotificationState = {
      id: 'old',
      type: 'info',
      title: 'Old',
      message: 'Old notification',
      timestamp: new Date('2023-01-01'),
      duration: 5000
    };

    const newNotification: NotificationState = {
      id: 'new',
      type: 'info',
      title: 'New',
      message: 'New notification',
      timestamp: new Date('2023-12-31'),
      duration: 5000
    };

    render(
      <NotificationSystem
        notifications={[oldNotification, newNotification]}
        onDismiss={mockOnDismiss}
      />
    );

    const notifications = screen.getAllByRole('alert');
    expect(notifications[0]).toHaveTextContent('New');
    expect(notifications[1]).toHaveTextContent('Old');
  });
});