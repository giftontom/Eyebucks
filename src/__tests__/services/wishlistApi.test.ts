import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

import { wishlistApi } from '../../../services/api/wishlist.api';

describe('wishlistApi', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('list', () => {
    it('should return wishlist entries for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'w1', course_id: 'c1', created_at: '2024-01-01' }],
              error: null,
            }),
          }),
        }),
      });

      const result = await wishlistApi.list();
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe('c1');
    });

    it('should return empty array when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await wishlistApi.list();
      expect(result).toEqual([]);
    });

    it('should throw on DB error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      });

      await expect(wishlistApi.list()).rejects.toThrow('DB error');
    });
  });

  describe('add', () => {
    it('should insert a wishlist entry', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      await wishlistApi.add('c1');
      expect(insertMock).toHaveBeenCalledWith({ user_id: 'u1', course_id: 'c1' });
    });

    it('should throw when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(wishlistApi.add('c1')).rejects.toThrow('Not authenticated');
    });

    it('should not throw on duplicate key (idempotent)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: 'duplicate key', code: '23505' } }),
      });

      await expect(wishlistApi.add('c1')).resolves.toBeUndefined();
    });

    it('should throw on non-duplicate DB error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: 'foreign key violation', code: '23503' } }),
      });

      await expect(wishlistApi.add('c1')).rejects.toThrow('foreign key violation');
    });
  });

  describe('remove', () => {
    it('should delete a wishlist entry', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      const eqMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockSupabase.from.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: eqMock }) });

      await wishlistApi.remove('c1');
      expect(mockSupabase.from).toHaveBeenCalledWith('wishlists');
    });

    it('should throw when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(wishlistApi.remove('c1')).rejects.toThrow('Not authenticated');
    });
  });
});
