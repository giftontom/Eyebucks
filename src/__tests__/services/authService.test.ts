import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

import { usersApi } from '../../../services/api/users.api';

describe('usersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await usersApi.getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return user profile when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockProfile = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.jpg',
        phone_e164: '+1234567890',
        role: 'USER',
        phone_verified: true,
        email_verified: true,
        google_id: 'google-123',
        created_at: '2024-01-01T00:00:00Z',
        last_login_at: '2024-06-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await usersApi.getCurrentUser();
      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-123');
      expect(result!.name).toBe('Test User');
      expect(result!.email).toBe('test@example.com');
      expect(result!.role).toBe('USER');
    });
  });

  describe('updatePhone', () => {
    it('should reject invalid E.164 phone numbers', async () => {
      await expect(usersApi.updatePhone('user-123', '1234567890')).rejects.toThrow(
        'Invalid E.164 format'
      );
      await expect(usersApi.updatePhone('user-123', '+0123')).rejects.toThrow(
        'Invalid E.164 format'
      );
    });

    it('should accept valid E.164 phone numbers', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(usersApi.updatePhone('user-123', '+14155552671')).resolves.not.toThrow();
    });
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(
        usersApi.updateProfile('user-123', { name: 'New Name' })
      ).resolves.not.toThrow();
    });
  });
});
