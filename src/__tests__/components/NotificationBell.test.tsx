import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NotificationBell } from '../../../components/NotificationBell';

import type { Notification } from '../../../services/api/notifications.api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockNotificationsHook = {
  notifications: [] as Notification[],
  unreadCount: 0,
  isLoading: false,
  markAsRead: mockMarkAsRead,
  markAllAsRead: mockMarkAllAsRead,
  refresh: vi.fn(),
};

vi.mock('../../../hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => mockNotificationsHook,
}));


const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'enrollment',
  title: 'You enrolled!',
  message: 'Welcome to the course',
  link: '/learn/course-1',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationsHook.notifications = [];
    mockNotificationsHook.unreadCount = 0;
    mockNotificationsHook.isLoading = false;
  });

  const renderBell = () =>
    render(
      <HashRouter>
        <NotificationBell />
      </HashRouter>
    );

  it('renders bell button with aria-label', () => {
    renderBell();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    mockNotificationsHook.unreadCount = 5;
    renderBell();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('caps badge at 99+', () => {
    mockNotificationsHook.unreadCount = 150;
    renderBell();
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('does not show badge when unreadCount is 0', () => {
    mockNotificationsHook.unreadCount = 0;
    renderBell();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    mockNotificationsHook.notifications = [makeNotification()];
    mockNotificationsHook.unreadCount = 1;
    renderBell();

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('You enrolled!')).toBeInTheDocument();
  });

  it('closes dropdown on second click', async () => {
    mockNotificationsHook.notifications = [makeNotification()];
    renderBell();

    const bell = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(bell);
    expect(screen.getByText('You enrolled!')).toBeInTheDocument();

    await userEvent.click(bell);
    expect(screen.queryByText('You enrolled!')).not.toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading', async () => {
    mockNotificationsHook.isLoading = true;
    renderBell();

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no notifications', async () => {
    mockNotificationsHook.notifications = [];
    renderBell();

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('calls markAsRead and navigates on notification click', async () => {
    const notif = makeNotification({ id: 'n-1', link: '/learn/c1', read: false });
    mockNotificationsHook.notifications = [notif];
    mockNotificationsHook.unreadCount = 1;
    renderBell();

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('You enrolled!'));

    expect(mockMarkAsRead).toHaveBeenCalledWith('n-1');
    expect(mockNavigate).toHaveBeenCalledWith('/learn/c1');
  });

  it('does not call markAsRead for already-read notifications', async () => {
    const notif = makeNotification({ read: true });
    mockNotificationsHook.notifications = [notif];
    renderBell();

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('You enrolled!'));

    expect(mockMarkAsRead).not.toHaveBeenCalled();
  });

  it('shows "Mark all read" button when there are unread notifications', async () => {
    mockNotificationsHook.notifications = [makeNotification()];
    mockNotificationsHook.unreadCount = 1;
    renderBell();

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const markAllBtn = screen.getByText(/mark all read/i);
    await userEvent.click(markAllBtn);

    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });

  it('includes unread count in aria-label', () => {
    mockNotificationsHook.unreadCount = 3;
    renderBell();
    expect(screen.getByRole('button', { name: 'Notifications (3 unread)' })).toBeInTheDocument();
  });
});
