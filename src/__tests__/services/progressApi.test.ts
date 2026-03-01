import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

import { progressApi, COMPLETION_THRESHOLD } from '../../../services/api/progress.api';

// Helper: chain mock for .from().select().eq().eq().eq().maybeSingle()
function mockChainedQuery(result: { data: any; error: any }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue(result),
  };
  mockSupabase.from.mockReturnValue(chain);
  return chain;
}

describe('progressApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('COMPLETION_THRESHOLD', () => {
    it('should be 0.95 (95%)', () => {
      expect(COMPLETION_THRESHOLD).toBe(0.95);
    });
  });

  describe('saveProgress', () => {
    it('should do nothing when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await progressApi.saveProgress('course-1', 'module-1', 120);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should insert progress when no existing record', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(chain);

      await progressApi.saveProgress('course-1', 'module-1', 120);
      expect(mockSupabase.from).toHaveBeenCalledWith('progress');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          course_id: 'course-1',
          module_id: 'module-1',
          timestamp: 120,
          view_count: 1,
        })
      );
    });

    it('should use RPC to increment when existing record found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'prog-1' }, error: null }),
        update: vi.fn().mockReturnThis(),
      };
      mockSupabase.from.mockReturnValue(chain);
      mockSupabase.rpc.mockReturnValue(
        Promise.resolve({ data: null, error: null })
      );

      await progressApi.saveProgress('course-1', 'module-1', 120);
      expect(mockSupabase.from).toHaveBeenCalledWith('progress');
    });
  });

  describe('markComplete', () => {
    it('should invoke progress-complete Edge Function', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, progress: {}, stats: {} },
        error: null,
      });

      const result = await progressApi.markComplete('course-1', 'module-1', 570, 600);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('progress-complete', {
        body: { courseId: 'course-1', moduleId: 'module-1', currentTime: 570, duration: 600 },
      });
      expect(result.success).toBe(true);
    });

    it('should throw on Edge Function error', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      await expect(progressApi.markComplete('c', 'm')).rejects.toThrow('Server error');
    });
  });

  describe('checkCompletion', () => {
    it('should return false when duration is 0', async () => {
      const result = await progressApi.checkCompletion('c', 'm', 100, 0);
      expect(result).toBe(false);
    });

    it('should return false when below threshold', async () => {
      // 90% < 95%
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
      const result = await progressApi.checkCompletion('c', 'm', 90, 100);
      expect(result).toBe(false);
    });

    it('should mark complete when at threshold and not yet completed', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
      mockChainedQuery({ data: null, error: null }); // getModuleProgress returns null
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await progressApi.checkCompletion('c', 'm', 96, 100);
      expect(result).toBe(true);
      expect(mockSupabase.functions.invoke).toHaveBeenCalled();
    });

    it('should return false when already completed', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
      mockChainedQuery({
        data: { module_id: 'm', completed: true, timestamp: 96, completed_at: '2024-01-01' },
        error: null,
      });

      const result = await progressApi.checkCompletion('c', 'm', 96, 100);
      expect(result).toBe(false);
    });
  });

  describe('getModuleProgress', () => {
    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await progressApi.getModuleProgress('c', 'm');
      expect(result).toBeNull();
    });

    it('should map progress data correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
      mockChainedQuery({
        data: {
          module_id: 'mod-1',
          timestamp: 300,
          completed: true,
          completed_at: '2024-06-01T00:00:00Z',
          watch_time: 500,
          view_count: 3,
          last_updated_at: '2024-06-01T12:00:00Z',
        },
        error: null,
      });

      const result = await progressApi.getModuleProgress('c', 'mod-1');
      expect(result).toEqual({
        moduleId: 'mod-1',
        lastTimestamp: 300,
        completed: true,
        completedAt: '2024-06-01T00:00:00Z',
        watchTime: 500,
        viewCount: 3,
        lastUpdatedAt: '2024-06-01T12:00:00Z',
      });
    });
  });

  describe('getResumePosition', () => {
    it('should return 0 when no progress exists', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const pos = await progressApi.getResumePosition('c', 'm');
      expect(pos).toBe(0);
    });

    it('should return last timestamp from progress', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
      mockChainedQuery({
        data: { module_id: 'm', timestamp: 450, completed: false },
        error: null,
      });
      const pos = await progressApi.getResumePosition('c', 'm');
      expect(pos).toBe(450);
    });
  });

  describe('getProgress', () => {
    it('should return empty array when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await progressApi.getProgress('c');
      expect(result).toEqual([]);
    });
  });

  describe('getCourseStats', () => {
    it('should return default stats when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const stats = await progressApi.getCourseStats('c');
      expect(stats).toEqual({
        completedModules: 0,
        totalModules: 0,
        overallPercent: 0,
        totalWatchTime: 0,
        currentModule: null,
      });
    });

    it('should call RPC for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
      mockSupabase.rpc.mockResolvedValue({
        data: { completedModules: 5, totalModules: 10, overallPercent: 50 },
        error: null,
      });

      const stats = await progressApi.getCourseStats('c');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_progress_stats', {
        p_user_id: 'u',
        p_course_id: 'c',
      });
      expect(stats.completedModules).toBe(5);
    });
  });
});
