import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

import { coursesApi } from '../../../services/api/courses.api';

const mockCourseRow = {
  id: 'course-1',
  slug: 'test-course',
  title: 'Test Course',
  description: 'A test course',
  price: 99900,
  thumbnail: 'thumb.jpg',
  hero_video_id: null,
  type: 'MODULE',
  status: 'PUBLISHED',
  rating: 4.5,
  total_students: 10,
  features: [],
  deleted_at: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  modules: [],
  reviews: [],
};

describe('coursesApi', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getCourses', () => {
    type MainQuery = {
      from: { select: ReturnType<typeof vi.fn> };
      builder: Record<string, ReturnType<typeof vi.fn>>;
      order: ReturnType<typeof vi.fn>;
      range: ReturnType<typeof vi.fn>;
    };

    /**
     * Build a chainable mock for the single main courses query. The query
     * returns both `data` and the filtered `count` from the same `.range()` call:
     * `.select(*, { count: 'exact' }).eq().[gte/lte/or].order().range()`.
     */
    function makeMainQuery(
      { data = [mockCourseRow] as unknown[] | null, count = 1 as number | null, error = null as { message: string } | null } = {},
    ): MainQuery {
      const range = vi.fn().mockResolvedValue({ data, count, error });
      const order = vi.fn().mockReturnValue({ range });
      const builder: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const method of ['eq', 'gte', 'lte', 'or']) {
        builder[method] = vi.fn().mockReturnValue(builder);
      }
      builder.order = order;
      const select = vi.fn().mockReturnValue(builder);
      return { from: { select }, builder, order, range };
    }

    it('should return published courses', async () => {
      const q = makeMainQuery();
      mockSupabase.from.mockReturnValue(q.from);
      const result = await coursesApi.getCourses();
      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].title).toBe('Test Course');
    });

    it('should throw on DB error', async () => {
      const q = makeMainQuery({ data: null, count: 0, error: { message: 'DB error' } });
      mockSupabase.from.mockReturnValue(q.from);
      await expect(coursesApi.getCourses()).rejects.toThrow('DB error');
    });

    it('defaults to newest sort (created_at desc)', async () => {
      const q = makeMainQuery();
      mockSupabase.from.mockReturnValue(q.from);
      await coursesApi.getCourses();
      expect(q.order).toHaveBeenCalledWith('created_at', { ascending: false, nullsFirst: false });
    });

    it('maps the sort option to the correct column + direction', async () => {
      const q = makeMainQuery();
      mockSupabase.from.mockReturnValue(q.from);
      await coursesApi.getCourses({ sort: 'price-asc' });
      expect(q.order).toHaveBeenCalledWith('price', { ascending: true, nullsFirst: false });
    });

    it('applies type, rating, price, and search filters server-side', async () => {
      const q = makeMainQuery();
      mockSupabase.from.mockReturnValue(q.from);
      await coursesApi.getCourses({ type: 'BUNDLE', minRating: 4, maxPrice: 99900, search: 'cinema' });
      expect(q.builder.eq).toHaveBeenCalledWith('status', 'PUBLISHED');
      expect(q.builder.eq).toHaveBeenCalledWith('type', 'BUNDLE');
      expect(q.builder.gte).toHaveBeenCalledWith('rating', 4);
      expect(q.builder.lte).toHaveBeenCalledWith('price', 99900);
      expect(q.builder.or).toHaveBeenCalledWith(expect.stringContaining('title.ilike.%cinema%'));
    });

    it('escapes search input before passing it to .or() (injection guard)', async () => {
      const q = makeMainQuery();
      mockSupabase.from.mockReturnValue(q.from);
      await coursesApi.getCourses({ search: 'a,b)c' });
      const orArg = q.builder.or.mock.calls[0][0] as string;
      expect(orArg).not.toContain('a,b)c');   // raw, unescaped input must not appear
      expect(orArg).toContain('a\\,b\\)c');    // escaped form is what reaches PostgREST
    });

    it('should fetch bundled courses for BUNDLE type', async () => {
      const bundleCourseRow = { ...mockCourseRow, id: 'bundle-1', type: 'BUNDLE' };
      const bundledCourseRow = {
        ...mockCourseRow, id: 'c1', title: 'Bundled Course', slug: 'bundled', thumbnail: 'thumb.jpg', modules: [{ id: 'm1' }],
      };

      let coursesCall = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'courses') {
          coursesCall++;
          if (coursesCall === 1) {
            // main query — returns data + count together
            return makeMainQuery({ data: [bundleCourseRow], count: 1 }).from;
          }
          // bundled course details query: .select().in()
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [bundledCourseRow], error: null }),
            }),
          };
        }
        // bundle_courses links query: .select().in().order()
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ bundle_id: 'bundle-1', course_id: 'c1' }],
                error: null,
              }),
            }),
          }),
        };
      });

      const result = await coursesApi.getCourses();
      expect(result.success).toBe(true);
      const bundle = result.courses.find(c => c.id === 'bundle-1');
      expect(bundle?.bundledCourses).toHaveLength(1);
      expect(bundle?.bundledCourses?.[0].title).toBe('Bundled Course');
    });

    it('should handle empty data gracefully', async () => {
      const q = makeMainQuery({ data: null, count: 0 });
      mockSupabase.from.mockReturnValue(q.from);
      const result = await coursesApi.getCourses();
      expect(result.courses).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getCourse', () => {
    it('should fetch by UUID and return course', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      // Chain: .from().select().eq().single()
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCourseRow, error: null }),
          }),
        }),
      });

      const result = await coursesApi.getCourse(uuid);
      expect(result.success).toBe(true);
      expect(result.course.id).toBe('course-1');
    });

    it('should fetch by slug or string ID when non-UUID passed', async () => {
      const orMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockCourseRow, error: null }),
      });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ or: orMock }),
      });

      const result = await coursesApi.getCourse('test-course');
      expect(result.success).toBe(true);
      expect(result.course.slug).toBe('test-course');
      // Regression: old code used startsWith('c') heuristic — verify .or() contains both slug and id
      expect(orMock).toHaveBeenCalledWith(expect.stringContaining('slug.eq.test-course'));
      expect(orMock).toHaveBeenCalledWith(expect.stringContaining('id.eq.test-course'));
    });

    it('uses .or() for slugs starting with "c" (regression: old startsWith("c") bug)', async () => {
      const orMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { ...mockCourseRow, slug: 'cinematography-basics' }, error: null }),
      });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ or: orMock }),
      });

      const result = await coursesApi.getCourse('cinematography-basics');
      expect(result.success).toBe(true);
      expect(orMock).toHaveBeenCalledWith(expect.stringContaining('slug.eq.cinematography-basics'));
    });

    it('should throw when course not found (DB returns PGRST116 error)', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }),
          }),
        }),
      });

      await expect(coursesApi.getCourse(uuid)).rejects.toThrow();
    });
  });

  describe('getCoursesByIds', () => {
    it('should return empty array for empty ids', async () => {
      const result = await coursesApi.getCoursesByIds([]);
      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch courses by id list', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'c1', title: 'T', thumbnail: '', type: 'MODULE', description: '' }],
            error: null,
          }),
        }),
      });

      const result = await coursesApi.getCoursesByIds(['c1']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
    });
  });

  describe('getCourseModules', () => {
    const mockModuleRow = {
      id: 'm1',
      course_id: 'course-1',
      title: 'Module 1',
      duration: '10:00',
      duration_seconds: 600,
      video_url: 'https://cdn.example.com/video.m3u8',
      video_id: 'bunny-guid-123',
      is_free_preview: false,
      order_index: 1,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    it('should redact videoId and videoUrl for non-enrolled users on non-preview modules', async () => {
      // Unauthenticated — auth.getUser returns null user
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      // Chain: .from('modules').select().eq().order()
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [mockModuleRow], error: null }),
          }),
        }),
      });

      const result = await coursesApi.getCourseModules('course-1');
      expect(result.hasAccess).toBe(false);
      expect(result.modules[0].videoUrl).toBe('');
      expect(result.modules[0].videoId).toBeUndefined();
    });

    it('should preserve videoId and videoUrl for free-preview modules without access', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ ...mockModuleRow, is_free_preview: true, video_id: 'bunny-preview-guid', video_url: 'https://cdn.example.com/preview.m3u8' }],
              error: null,
            }),
          }),
        }),
      });

      const result = await coursesApi.getCourseModules('course-1');
      expect(result.modules[0].videoId).toBe('bunny-preview-guid');
      expect(result.modules[0].videoUrl).toBe('https://cdn.example.com/preview.m3u8');
    });

    it('should populate videoId from video_id field via mapModule', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'modules') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [mockModuleRow], error: null }),
              }),
            }),
          };
        }
        if (table === 'enrollments') {
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
        }
        // users table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'USER' }, error: null }),
            }),
          }),
        };
      });

      const result = await coursesApi.getCourseModules('course-1');
      expect(result.hasAccess).toBe(true);
      expect(result.modules[0].videoId).toBe('bunny-guid-123');
    });

    it('admin role has access even without enrollment', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'modules') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [mockModuleRow], error: null }),
              }),
            }),
          };
        }
        if (table === 'enrollments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // not enrolled
                  }),
                }),
              }),
            }),
          };
        }
        // users table returns ADMIN role
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'ADMIN' }, error: null }),
            }),
          }),
        };
      });

      const result = await coursesApi.getCourseModules('course-1');
      expect(result.hasAccess).toBe(true);
      expect(result.modules[0].videoId).toBe('bunny-guid-123');
    });

    it('returns hasAccess false and redacts video when enrollment check errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'modules') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [mockModuleRow], error: null }),
              }),
            }),
          };
        }
        if (table === 'enrollments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'USER' }, error: null }),
            }),
          }),
        };
      });

      const result = await coursesApi.getCourseModules('course-1');
      expect(result.hasAccess).toBe(false);
      expect(result.modules[0].videoUrl).toBe('');
    });
  });
});
