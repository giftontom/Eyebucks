import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

import { notificationsApi } from '../../../services/api/notifications.api';

const mockRow = {
  id: 'n1',
  user_id: 'u1',
  type: 'enrollment' as const,
  title: 'Enrolled!',
  message: 'You enrolled in a course',
  link: '/dashboard',
  read: false,
  created_at: '2024-01-01',
};

describe('notificationsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getNotifications', () => {
    it('should return mapped notifications', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [mockRow], error: null }),
          }),
        }),
      });

      const result = await notificationsApi.getNotifications();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('n1');
      expect(result[0].type).toBe('enrollment');
      expect(result[0].read).toBe(false);
    });

    it('should throw on DB error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      });

      await expect(notificationsApi.getNotifications()).rejects.toThrow('DB error');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      });

      const count = await notificationsApi.getUnreadCount();
      expect(count).toBe(5);
    });

    it('should return 0 when count is null', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: null, error: null }),
        }),
      });

      const count = await notificationsApi.getUnreadCount();
      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should update read flag without throwing', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await expect(notificationsApi.markAsRead('n1')).resolves.toBeUndefined();
      expect(eqMock).toHaveBeenCalledWith('id', 'n1');
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread for current user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      const eqMock2 = vi.fn().mockResolvedValue({ error: null });
      const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock1 }),
      });

      await notificationsApi.markAllAsRead();
      expect(eqMock1).toHaveBeenCalledWith('user_id', 'u1');
    });

    it('should return early when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(notificationsApi.markAllAsRead()).resolves.toBeUndefined();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('deleteNotification', () => {
    it('should delete by id without throwing', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await expect(notificationsApi.deleteNotification('n1')).resolves.toBeUndefined();
      expect(eqMock).toHaveBeenCalledWith('id', 'n1');
    });

    it('should not throw on error (logs instead)', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      });

      await expect(notificationsApi.deleteNotification('n1')).resolves.toBeUndefined();
    });
  });

  describe('getNotifications null data', () => {
    it('should return empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await notificationsApi.getNotifications();
      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount null count', () => {
    it('should return 0 when count is null', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: null, error: null }),
        }),
      });

      const result = await notificationsApi.getUnreadCount();
      expect(result).toBe(0);
    });
  });

  describe('markAsRead error', () => {
    it('should not throw on error (logs instead)', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      });

      await expect(notificationsApi.markAsRead('n1')).resolves.toBeUndefined();
    });
  });

  describe('markAllAsRead error', () => {
    it('should not throw on DB error (logs instead)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
          }),
        }),
      });

      await expect(notificationsApi.markAllAsRead()).resolves.toBeUndefined();
    });
  });
});
