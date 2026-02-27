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

import { enrollmentsApi } from '../../../services/api/enrollments.api';

describe('enrollmentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserEnrollments', () => {
    it('should return empty array when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await enrollmentsApi.getUserEnrollments();
      expect(result).toEqual([]);
    });

    it('should fetch user enrollments with courses', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockData = [
        {
          id: 'enroll-1',
          user_id: 'user-123',
          course_id: 'course-1',
          status: 'ACTIVE',
          enrolled_at: '2024-01-01T00:00:00Z',
          last_accessed_at: null,
          payment_id: null,
          order_id: null,
          amount: 9900,
          expires_at: null,
          completed_modules: [],
          current_module: null,
          overall_percent: 50,
          total_watch_time: 3600,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          courses: {
            id: 'course-1',
            slug: 'react-course',
            title: 'React Course',
            description: 'Learn React',
            price: 9900,
            thumbnail: 'thumb.jpg',
            hero_video_id: null,
            type: 'MODULE',
            status: 'PUBLISHED',
            rating: 4.5,
            total_students: 100,
            features: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            published_at: '2024-01-01T00:00:00Z',
          },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await enrollmentsApi.getUserEnrollments();
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe('course-1');
      expect(result[0].overallPercent).toBe(50);
    });
  });

  describe('checkAccess', () => {
    it('should return false when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await enrollmentsApi.checkAccess('course-123');
      expect(result).toBe(false);
    });

    it('should return true for admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'ADMIN' },
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await enrollmentsApi.checkAccess('course-123');
      expect(result).toBe(true);
    });
  });
});
