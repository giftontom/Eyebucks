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

    it('should return true when enrolled user has active enrollment', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

      let fromCallCount = 0;
      mockSupabase.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // users table for role check
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'USER' }, error: null }),
              }),
            }),
          };
        }
        // enrollments table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'e1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await enrollmentsApi.checkAccess('course-123');
      expect(result).toBe(true);
    });

    it('should return false when not enrolled', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

      let fromCallCount = 0;
      mockSupabase.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'USER' }, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await enrollmentsApi.checkAccess('course-123');
      expect(result).toBe(false);
    });
  });

  describe('getEnrollment', () => {
    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await enrollmentsApi.getEnrollment('c1');
      expect(result).toBeNull();
    });

    it('should return enrollment when found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      const mockRow = {
        id: 'e1', user_id: 'u1', course_id: 'c1', status: 'ACTIVE',
        enrolled_at: '2024-01-01T00:00:00Z', last_accessed_at: null,
        payment_id: 'p1', order_id: 'o1', amount: 9900, expires_at: null,
        completed_modules: ['m1'], current_module: 'm2', overall_percent: 50,
        total_watch_time: 1800, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await enrollmentsApi.getEnrollment('c1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('e1');
      expect(result!.overallPercent).toBe(50);
    });

    it('should return null on error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          }),
        }),
      });

      const result = await enrollmentsApi.getEnrollment('c1');
      expect(result).toBeNull();
    });
  });

  describe('updateLastAccess', () => {
    it('should call update on enrollments', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await enrollmentsApi.updateLastAccess('e1');
      expect(eqMock).toHaveBeenCalledWith('id', 'e1');
    });
  });

  describe('updateProgress', () => {
    it('should update progress fields', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await enrollmentsApi.updateProgress('e1', {
        completedModules: ['m1', 'm2'],
        overallPercent: 75,
        totalWatchTime: 3600,
      });

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        completed_modules: ['m1', 'm2'],
        overall_percent: 75,
        total_watch_time: 3600,
      }));
    });
  });
});
