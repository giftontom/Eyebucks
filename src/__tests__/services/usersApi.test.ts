import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

import { usersApi } from '../../../services/api/users.api';

const mockProfile = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@test.com',
  avatar: 'avatar.jpg',
  phone_e164: '+15550000000',
  role: 'USER',
  phone_verified: true,
  email_verified: true,
  google_id: null,
  is_active: true,
  created_at: '2024-01-01',
  last_login_at: null,
};

describe('usersApi', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getCurrentUser', () => {
    it('should return mapped user when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      });

      const user = await usersApi.getCurrentUser();
      expect(user).not.toBeNull();
      expect(user!.name).toBe('Alice');
      expect(user!.role).toBe('USER');
    });

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const user = await usersApi.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return null on DB error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      });

      const user = await usersApi.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('updatePhone', () => {
    it('should throw for invalid E.164 format', async () => {
      await expect(usersApi.updatePhone('u1', 'not-a-phone')).rejects.toThrow('Invalid E.164 format');
      await expect(usersApi.updatePhone('u1', '5550000000')).rejects.toThrow('Invalid E.164 format');
    });

    it('should update phone for valid E.164 number', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await expect(usersApi.updatePhone('u1', '+15550000000')).resolves.toBeUndefined();
      expect(eqMock).toHaveBeenCalledWith('id', 'u1');
    });

    it('should throw on DB error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      });

      await expect(usersApi.updatePhone('u1', '+15550000000')).rejects.toThrow('Failed to update phone number');
    });
  });

  describe('updateProfile', () => {
    it('should update name successfully', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await expect(usersApi.updateProfile('u1', { name: 'Bob' })).resolves.toBeUndefined();
    });

    it('should throw on DB error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'update failed' } }),
        }),
      });

      await expect(usersApi.updateProfile('u1', { name: 'Bob' })).rejects.toThrow('Failed to update profile');
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      const partialProfile = {
        id: 'u1', name: 'Alice', email: 'alice@test.com', avatar: null,
        role: 'USER', created_at: '2024-01-01',
      };
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: partialProfile, error: null }),
          }),
        }),
      });

      const result = await usersApi.getUser('u1');
      expect(result).not.toBeNull();
      expect(result!.avatar).toBe('');  // null → fallback ''
    });

    it('should return null on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      });

      const result = await usersApi.getUser('u1');
      expect(result).toBeNull();
    });
  });

  describe('mapUserProfile edge cases', () => {
    it('should handle null optional fields gracefully', async () => {
      const nullProfile = {
        ...mockProfile,
        name: null, email: null, avatar: null, phone_e164: null,
        role: null, phone_verified: null, email_verified: null,
        google_id: null, created_at: null, last_login_at: null,
      };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: nullProfile, error: null }),
          }),
        }),
      });

      const user = await usersApi.getCurrentUser();
      expect(user!.name).toBe('');
      expect(user!.email).toBe('');
      expect(user!.phone_e164).toBeNull();
      expect(user!.role).toBe('USER');
    });
  });
});
