import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

import { adminApi } from '../../../services/api/admin.api';

describe('adminApi', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getStats', () => {
    it('should return admin stats from RPC', async () => {
      // getStats calls supabase.rpc('get_admin_stats') directly
      const mockStats = {
        total_users: 100,
        active_users: 80,
        total_revenue: 5000000,
        total_courses: 5,
        total_enrollments: 200,
        total_certificates: 50,
      };
      mockSupabase.rpc.mockResolvedValue({ data: mockStats, error: null });

      const result = await adminApi.getStats();
      expect(result.success).toBe(true);
      // API casts data as AdminStats without re-mapping — check raw shape
      expect((result.stats as unknown as typeof mockStats).total_users).toBe(100);
    });

    it('should throw on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });
      await expect(adminApi.getStats()).rejects.toThrow('RPC error');
    });
  });

  describe('getUsers', () => {
    it('should return paginated users without search', async () => {
      // Chain without search/role: .from().select().order().range()
      const mockUsers = [{
        id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'USER',
        avatar: null, is_active: true, phone_verified: false, phone_e164: null,
        created_at: '2024-01-01', last_login_at: null, enrollments: [],
      }];

      const rangeMock = vi.fn().mockResolvedValue({ data: mockUsers, error: null, count: 1 });
      const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ order: orderMock }),
      });

      const result = await adminApi.getUsers({ page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe('alice@test.com');
      expect(result.total).toBeUndefined(); // total is inside pagination
      expect(result.pagination.total).toBe(1);
    });

    it('should apply search filter when provided', async () => {
      // Chain with search: .from().select().or().order().range()
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
      const orMock = vi.fn().mockReturnValue({ order: orderMock });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ or: orMock }),
      });

      const result = await adminApi.getUsers({ search: 'alice' });
      expect(result.success).toBe(true);
      expect(orMock).toHaveBeenCalledWith(expect.stringContaining('alice'));
    });

    it('should apply role filter when provided', async () => {
      // Chain with role: .from().select().eq().order().range()
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await adminApi.getUsers({ role: 'ADMIN' });
      expect(eqMock).toHaveBeenCalledWith('role', 'ADMIN');
    });
  });

  describe('getCourses', () => {
    it('should return all courses including drafts', async () => {
      const mockCourses = [{
        id: 'c1', title: 'Course 1', status: 'PUBLISHED', type: 'MODULE',
        price: 99900, deleted_at: null, slug: 'c1', description: '',
        thumbnail: null, hero_video_id: null, rating: null, total_students: 0,
        features: [], created_at: '2024-01-01', updated_at: '2024-01-01',
        modules: [], enrollments: [],
      }];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockCourses, error: null }),
        }),
      });

      const result = await adminApi.getCourses();
      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].title).toBe('Course 1');
    });
  });

  describe('deleteCourse', () => {
    it('should soft-delete by setting deleted_at', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      const result = await adminApi.deleteCourse('c1');
      expect(result.success).toBe(true);
      expect(eqMock).toHaveBeenCalledWith('id', 'c1');
    });
  });

  describe('publishCourse', () => {
    it('should update course status', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'c1', status: 'PUBLISHED' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await adminApi.publishCourse('c1', 'PUBLISHED');
      expect(result.success).toBe(true);
    });
  });

  describe('reorderModules', () => {
    it('should call reorder_modules RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await adminApi.reorderModules('c1', ['m2', 'm1', 'm3']);
      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('reorder_modules', {
        p_course_id: 'c1',
        p_module_ids: ['m2', 'm1', 'm3'],
      });
    });

    it('should throw on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
      await expect(adminApi.reorderModules('c1', ['m1'])).rejects.toThrow('RPC failed');
    });
  });

  describe('getSales', () => {
    it('should return sales data from RPC', async () => {
      const mockSales = [{ date: '2024-01-01', amount: '99900', count: 2 }];
      mockSupabase.rpc.mockResolvedValue({ data: mockSales, error: null });

      const result = await adminApi.getSales(30);
      expect(result.success).toBe(true);
      expect(result.sales).toHaveLength(1);
      expect(result.sales[0].date).toBe('2024-01-01');
      expect(result.sales[0].amount).toBe(99900);
    });

    it('should use default 30 days and handle empty data', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      const result = await adminApi.getSales();
      expect(result.sales).toEqual([]);
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity from RPC', async () => {
      const mockActivity = [{ type: 'enrollment', user: 'Alice' }];
      mockSupabase.rpc.mockResolvedValue({ data: mockActivity, error: null });

      const result = await adminApi.getRecentActivity(5);
      expect(result.success).toBe(true);
      expect(result.activity).toEqual(mockActivity);
    });
  });

  describe('createCourse', () => {
    it('should insert a new course as DRAFT', async () => {
      const newCourse = { id: 'c2', title: 'New Course', status: 'DRAFT' };
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newCourse, error: null }),
          }),
        }),
      });

      const result = await adminApi.createCourse({
        title: 'New Course',
        slug: 'new-course',
        description: 'A new course',
        price: 99900,
        type: 'MODULE',
      });

      expect(result.success).toBe(true);
      expect(result.course.title).toBe('New Course');
    });
  });

  describe('updateCourse', () => {
    it('should update course fields', async () => {
      const updated = { id: 'c1', title: 'Updated', status: 'PUBLISHED' };
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
        }),
      });

      const result = await adminApi.updateCourse('c1', { title: 'Updated', status: 'PUBLISHED' });
      expect(result.success).toBe(true);
      expect(result.course.title).toBe('Updated');
    });
  });

  describe('getModules', () => {
    it('should return chapters with nested lessons for a course', async () => {
      const mockLesson = {
        id: 'l1', module_id: 'm1', title: 'Lesson 1', duration: '5:00',
        duration_seconds: 300, video_url: 'https://cdn/test/playlist.m3u8',
        video_id: 'test-guid', is_free_preview: true, order_index: 1,
        created_at: '2024-01-01', updated_at: '2024-01-01',
      };
      const mockModules = [{
        id: 'm1', course_id: 'c1', title: 'Intro Chapter', order_index: 1,
        lessons: [mockLesson],
        created_at: '2024-01-01', updated_at: '2024-01-01',
      }];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockModules, error: null }),
          }),
        }),
      });

      const result = await adminApi.getModules('c1');
      expect(result.success).toBe(true);
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].title).toBe('Intro Chapter');
      // Chapters no longer carry video fields directly; lessons do
      expect(result.modules[0].lessons).toHaveLength(1);
      expect(result.modules[0].lessons![0].title).toBe('Lesson 1');
      expect(result.modules[0].lessons![0].durationSeconds).toBe(300);
    });
  });

  describe('deleteModule', () => {
    it('should delete module and invoke video cleanup for each lesson videoId', async () => {
      // deleteModule now queries `lessons` table (not `modules`) for video_ids of the chapter's lessons
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          // First call: select video_id from lessons where module_id = 'm1'
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ video_id: 'bunny-guid-123' }], error: null,
              }),
            }),
          };
        }
        // modules table: delete
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      });

      mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });

      const result = await adminApi.deleteModule('c1', 'm1');
      expect(result.success).toBe(true);
      // video-cleanup invoked for the lesson's video
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('video-cleanup', {
        body: { deleteVideoId: 'bunny-guid-123' },
      });
    });

    it('should delete module without video cleanup when no lesson has a videoId', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ video_id: null }], error: null,
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      });

      const result = await adminApi.deleteModule('c1', 'm1');
      expect(result.success).toBe(true);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should delete module without video cleanup when no lessons exist', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      });

      const result = await adminApi.deleteModule('c1', 'm1');
      expect(result.success).toBe(true);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('createLesson', () => {
    it('should create a lesson under a module', async () => {
      const newLesson = {
        id: 'l1', module_id: 'm1', title: 'Lesson 1', duration: '5:00',
        duration_seconds: 300, video_url: 'https://cdn/vid.m3u8', video_id: 'bunny-guid',
        is_free_preview: false, order_index: 1, created_at: '2024-01-01', updated_at: '2024-01-01',
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // order_index query
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        // insert
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: newLesson, error: null }),
            }),
          }),
        };
      });

      const result = await adminApi.createLesson('m1', {
        title: 'Lesson 1',
        duration: '5:00',
        videoUrl: 'https://cdn/vid.m3u8',
        videoId: 'bunny-guid',
      });

      expect(result.success).toBe(true);
      expect(result.lesson.title).toBe('Lesson 1');
      expect(result.lesson.durationSeconds).toBe(300);
    });
  });

  describe('updateLesson', () => {
    it('should update lesson fields', async () => {
      const updatedLesson = {
        id: 'l1', module_id: 'm1', title: 'Updated Lesson', duration: '6:00',
        duration_seconds: 360, video_url: 'https://cdn/vid2.m3u8', video_id: 'bunny-guid-2',
        is_free_preview: true, order_index: 1, created_at: '2024-01-01', updated_at: '2024-01-01',
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedLesson, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await adminApi.updateLesson('m1', 'l1', { title: 'Updated Lesson', isFreePreview: true });
      expect(result.success).toBe(true);
      expect(result.lesson.title).toBe('Updated Lesson');
    });

    it('should normalize empty videoId to null so video_id is never an empty string', async () => {
      const updatedLesson = {
        id: 'l1', module_id: 'm1', title: 'Lesson', duration: '6:00',
        duration_seconds: 360, video_url: 'https://cdn/vid.m3u8', video_id: null,
        is_free_preview: false, order_index: 1, created_at: '2024-01-01', updated_at: '2024-01-01',
      };
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedLesson, error: null }),
            }),
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await adminApi.updateLesson('m1', 'l1', { videoId: '' });
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ video_id: null }));
    });
  });

  describe('listLibraryVideos', () => {
    const libraryResponse = {
      success: true,
      page: 1,
      itemsPerPage: 24,
      totalItems: 2,
      videos: [
        {
          guid: 'aaaa1111-2222-3333-4444-555566667777', title: 'Intro', dateUploaded: '2026-01-01',
          status: 4, lengthSeconds: 90, thumbnailUrl: 'https://cdn/aaaa/thumbnail.jpg',
          hlsUrl: 'https://cdn/aaaa/playlist.m3u8', isPlayable: true,
        },
        {
          guid: 'bbbb1111-2222-3333-4444-555566667777', title: 'Draft', dateUploaded: '2026-01-02',
          status: 3, lengthSeconds: 0, thumbnailUrl: 'https://cdn/bbbb/thumbnail.jpg',
          hlsUrl: 'https://cdn/bbbb/playlist.m3u8', isPlayable: false,
        },
      ],
    };

    it('should invoke admin-video-list with defaults and pass the response through', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({ data: libraryResponse, error: null });

      const result = await adminApi.listLibraryVideos();
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('admin-video-list', {
        body: { page: 1, itemsPerPage: 24, search: undefined },
      });
      expect(result.totalItems).toBe(2);
      expect(result.videos).toHaveLength(2);
      expect(result.videos[0].isPlayable).toBe(true);
    });

    it('should forward page and search params', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({ data: libraryResponse, error: null });

      await adminApi.listLibraryVideos({ page: 3, itemsPerPage: 12, search: 'intro' });
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('admin-video-list', {
        body: { page: 3, itemsPerPage: 12, search: 'intro' },
      });
    });

    it('should throw on invoke error', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: new Error('network') });
      await expect(adminApi.listLibraryVideos()).rejects.toThrow();
    });

    it('should throw when the function reports failure', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false, error: 'Video service not configured' },
        error: null,
      });
      await expect(adminApi.listLibraryVideos()).rejects.toThrow('Video service not configured');
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and invoke video cleanup if videoId exists', async () => {
      const lessonRow = { video_id: 'bunny-guid-456' };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: lessonRow, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      });

      mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });

      const result = await adminApi.deleteLesson('m1', 'l1');
      expect(result.success).toBe(true);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('video-cleanup', {
        body: { deleteVideoId: 'bunny-guid-456' },
      });
    });

    it('should delete lesson without video cleanup when no videoId', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { video_id: null }, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      });

      const result = await adminApi.deleteLesson('m1', 'l1');
      expect(result.success).toBe(true);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('reorderLessons', () => {
    it('should call reorder_lessons RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await adminApi.reorderLessons('m1', ['l2', 'l1', 'l3']);
      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('reorder_lessons', {
        p_module_id: 'm1',
        p_lesson_ids: ['l2', 'l1', 'l3'],
      });
    });

    it('should throw on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
      await expect(adminApi.reorderLessons('m1', ['l1'])).rejects.toThrow('RPC failed');
    });
  });

  describe('getBundleCourses', () => {
    it('should return course IDs for bundle', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ course_id: 'c1' }, { course_id: 'c2' }],
              error: null,
            }),
          }),
        }),
      });

      const result = await adminApi.getBundleCourses('bundle-1');
      expect(result.success).toBe(true);
      expect(result.courseIds).toEqual(['c1', 'c2']);
    });
  });

  describe('getCertificates', () => {
    it('should return paginated certificates', async () => {
      const mockCert = {
        id: 'cert-1', certificate_number: 'CERT-001', student_name: 'Alice',
        course_title: 'React', issue_date: '2024-01-01', status: 'ACTIVE',
        revoked_at: null, revoked_reason: null, created_at: '2024-01-01',
        users: { id: 'u1', name: 'Alice', email: 'alice@test.com' },
        courses: { id: 'c1', title: 'React' },
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [mockCert], error: null, count: 1 }),
          }),
        }),
      });

      const result = await adminApi.getCertificates();
      expect(result.success).toBe(true);
      expect(result.certificates).toHaveLength(1);
      expect(result.certificates[0].certificateNumber).toBe('CERT-001');
    });
  });

  describe('revokeCertificate', () => {
    it('should update certificate status to REVOKED', async () => {
      const revokedCert = { id: 'cert-1', status: 'REVOKED' };
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: revokedCert, error: null }),
            }),
          }),
        }),
      });

      const result = await adminApi.revokeCertificate('cert-1', 'Cheating');
      expect(result.success).toBe(true);
    });
  });

  describe('revokeEnrollment', () => {
    it('should update enrollment status to REVOKED', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await adminApi.revokeEnrollment('e1');
      expect(result.success).toBe(true);
    });
  });

  describe('getPayments', () => {
    it('should return paginated payments without search', async () => {
      const mockPayment = {
        id: 'p1', user_id: 'u1', course_id: 'c1', enrollment_id: 'e1',
        razorpay_order_id: 'order-1', razorpay_payment_id: 'pay-1',
        amount: 99900, currency: 'INR', status: 'captured', method: 'upi',
        receipt_number: 'REC-001', refund_id: null, refund_amount: null,
        refund_reason: null, refunded_at: null, metadata: {},
        created_at: '2024-01-01', updated_at: '2024-01-01',
        courses: { title: 'React' },
      };

      // payments query: select -> order -> range; buyer query: select -> in
      const rangeMock = vi.fn().mockResolvedValue({ data: [mockPayment], error: null, count: 1 });
      const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
      const inMock = vi.fn().mockResolvedValue({ data: [{ id: 'u1', name: 'Alice', email: 'alice@test.com' }], error: null });
      mockSupabase.from.mockImplementation((table: string) =>
        table === 'users'
          ? { select: vi.fn().mockReturnValue({ in: inMock }) }
          : { select: vi.fn().mockReturnValue({ order: orderMock }) }
      );

      const result = await adminApi.getPayments({ page: 1 });
      expect(result.success).toBe(true);
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].userName).toBe('Alice');
      expect(result.payments[0].courseTitle).toBe('React');
      expect(result.total).toBe(1);
    });

    it('should apply search filter', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
      const orMock = vi.fn().mockReturnValue({ order: orderMock });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ or: orMock }),
      });

      await adminApi.getPayments({ search: 'REC-001' });
      expect(orMock).toHaveBeenCalledWith(expect.stringContaining('REC-001'));
    });
  });

  describe('getCourseAnalytics', () => {
    it('should return course analytics from RPC', async () => {
      const mockAnalytics = { totalEnrollments: 10, completionRate: 0.7 };
      mockSupabase.rpc.mockResolvedValue({ data: mockAnalytics, error: null });

      const result = await adminApi.getCourseAnalytics('c1');
      expect(result.success).toBe(true);
    });
  });

  describe('restoreCourse', () => {
    it('should set deleted_at to null', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await adminApi.restoreCourse('c1');
      expect(result.success).toBe(true);
    });
  });

  describe('manualEnrollUser', () => {
    it('should enroll user manually', async () => {
      const enrollment = { id: 'e1', user_id: 'u1', course_id: 'c1', status: 'ACTIVE' };
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: enrollment, error: null }),
          }),
        }),
      });

      const result = await adminApi.manualEnrollUser('u1', 'c1');
      expect(result.success).toBe(true);
      expect(result.enrollment.status).toBe('ACTIVE');
    });

    it('should throw user-friendly error on duplicate enrollment', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null, error: { code: '23505', message: 'duplicate' },
            }),
          }),
        }),
      });

      await expect(adminApi.manualEnrollUser('u1', 'c1')).rejects.toThrow('already enrolled');
    });
  });
});
