import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase, mockUseAuth } = vi.hoisted(() => {
  const channelMock = {
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  channelMock.on.mockReturnValue(channelMock);
  channelMock.subscribe.mockReturnValue(channelMock);

  return {
    mockSupabase: {
      from: vi.fn(),
      channel: vi.fn().mockReturnValue(channelMock),
      removeChannel: vi.fn(),
    },
    mockUseAuth: vi.fn(),
  };
});

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

const mockNotifRow = {
  id: 'n1',
  user_id: 'u1',
  type: 'enrollment',
  title: 'Enrolled!',
  message: 'You enrolled in Course A',
  link: '/course/c1',
  read: false,
  created_at: '2024-01-01T00:00:00Z',
};

import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';

describe('useRealtimeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const channelMock = {
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    channelMock.on.mockReturnValue(channelMock);
    channelMock.subscribe.mockReturnValue(channelMock);
    mockSupabase.channel.mockReturnValue(channelMock);
  });

  it('returns empty state when user is not logged in', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useRealtimeNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it('loads notifications for authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [mockNotifRow], error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useRealtimeNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe('n1');
    expect(result.current.unreadCount).toBe(1);
  });

  it('counts only unread notifications', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    const readNotif = { ...mockNotifRow, id: 'n2', read: true };
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [mockNotifRow, readNotif],
              error: null,
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useRealtimeNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
  });

  it('markAsRead updates local state and calls supabase', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [mockNotifRow], error: null }),
              }),
            }),
          }),
          update: updateMock,
        };
      }
      return {};
    });

    const { result } = renderHook(() => useRealtimeNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unreadCount).toBe(1);

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(updateMock).toHaveBeenCalledWith({ read: true });
  });

  it('markAllAsRead marks all notifications as read', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    const unread2 = { ...mockNotifRow, id: 'n2' };

    const innerEqMock = vi.fn().mockResolvedValue({ error: null });
    const outerEqMock = vi.fn().mockReturnValue({ eq: innerEqMock });
    const updateMock = vi.fn().mockReturnValue({ eq: outerEqMock });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [mockNotifRow, unread2],
                  error: null,
                }),
              }),
            }),
          }),
          update: updateMock,
        };
      }
      return {};
    });

    const { result } = renderHook(() => useRealtimeNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unreadCount).toBe(2);

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every(n => n.read)).toBe(true);
  });

  it('refresh re-fetches notifications', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    const limitMock = vi.fn()
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [mockNotifRow], error: null });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ limit: limitMock }),
        }),
      }),
    });

    const { result } = renderHook(() => useRealtimeNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toHaveLength(0);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it('subscribes to realtime channel for authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });

    renderHook(() => useRealtimeNotifications());
    await waitFor(() => expect(mockSupabase.channel).toHaveBeenCalledWith('notifications-u1'));
  });
});
