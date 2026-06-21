import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../../services/api', () => ({
  progressApi: {
    getProgress: vi.fn(),
    getCourseStats: vi.fn(),
    getResumePosition: vi.fn(),
    updateCurrentLesson: vi.fn(),
    saveProgress: vi.fn(),
    updateTimestamp: vi.fn(),
    checkCompletion: vi.fn(),
  },
  AUTO_SAVE_INTERVAL: 30000,
}));
vi.mock('../../../utils/analytics', () => ({
  analytics: { track: vi.fn() },
}));

import { useModuleProgress } from '../../../hooks/useModuleProgress';
import { progressApi } from '../../../services/api';
import { analytics } from '../../../utils/analytics';

const mockProgressApi = progressApi as Record<string, ReturnType<typeof vi.fn>>;

const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'USER' as const };
const mockVideoRef = { current: { currentTime: 0, duration: 100 } } as Parameters<typeof useModuleProgress>[0]['videoRef'];

describe('useModuleProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgressApi.getProgress.mockResolvedValue([]);
    mockProgressApi.getCourseStats.mockResolvedValue({ overallPercent: 0 });
    mockProgressApi.getResumePosition.mockResolvedValue(0);
    mockProgressApi.updateCurrentLesson.mockResolvedValue(undefined);
    mockProgressApi.checkCompletion.mockResolvedValue(false);
  });

  it('loads lesson completion map on mount', async () => {
    mockProgressApi.getProgress.mockResolvedValue([
      { lessonId: 'lesson-1', completed: true },
      { lessonId: 'lesson-2', completed: false },
    ]);
    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: false,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );
    await waitFor(() => expect(result.current.lessonCompletionMap['lesson-1']).toBe(true));
    expect(result.current.lessonCompletionMap['lesson-2']).toBe(false);
  });

  it('loads course progress stats on mount', async () => {
    mockProgressApi.getCourseStats.mockResolvedValue({ overallPercent: 65 });
    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: false,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );
    await waitFor(() => expect(result.current.progressPercent).toBe(65));
  });

  it('fires lesson_completed analytics event when lesson is completed', async () => {
    mockProgressApi.checkCompletion.mockResolvedValue(true);
    mockProgressApi.getCourseStats.mockResolvedValue({ overallPercent: 100 });

    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: true,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );

    await act(async () => {
      result.current.checkCompletion(96, 100);
    });

    await waitFor(() =>
      expect(analytics.track).toHaveBeenCalledWith('lesson_completed', {
        course_id: 'course-1',
        lesson_id: 'lesson-1',
      })
    );
  });

  it('does not fire completion when threshold not met', async () => {
    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: true,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );

    act(() => {
      result.current.checkCompletion(50, 100); // 50% — below 95% threshold
    });

    expect(mockProgressApi.checkCompletion).not.toHaveBeenCalled();
  });

  it('does not load progress when user is null', async () => {
    renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: false,
        user: null,
        videoRef: mockVideoRef,
        hasAccess: false,
      })
    );
    await new Promise(r => setTimeout(r, 50));
    expect(mockProgressApi.getProgress).not.toHaveBeenCalled();
  });

  // ─── Auto-save timer tests ───────────────────────────────────────────────

  describe('auto-save timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockProgressApi.saveProgress.mockResolvedValue(undefined);
      mockProgressApi.updateTimestamp.mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls saveProgress (not updateTimestamp) on first auto-save for a lesson', async () => {
      const videoRef = { current: { currentTime: 15, duration: 100 } } as Parameters<typeof useModuleProgress>[0]['videoRef'];

      renderHook(() =>
        useModuleProgress({
          courseId: 'course-1',
          activeLessonId: 'lesson-1',
          isPlaying: true,
          user: mockUser,
          videoRef,
          hasAccess: true,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockProgressApi.saveProgress).toHaveBeenCalledWith('course-1', 'lesson-1', 15);
      expect(mockProgressApi.updateTimestamp).not.toHaveBeenCalled();
    });

    it('calls updateTimestamp (not saveProgress) on subsequent auto-saves', async () => {
      const videoRef = { current: { currentTime: 45, duration: 100 } } as Parameters<typeof useModuleProgress>[0]['videoRef'];

      renderHook(() =>
        useModuleProgress({
          courseId: 'course-1',
          activeLessonId: 'lesson-1',
          isPlaying: true,
          user: mockUser,
          videoRef,
          hasAccess: true,
        })
      );

      // First interval — calls saveProgress and marks viewIncremented
      await act(async () => { vi.advanceTimersByTime(30000); });
      // Flush the .then() callback that sets viewIncrementedRef
      await act(async () => {});

      expect(mockProgressApi.saveProgress).toHaveBeenCalledTimes(1);

      // Second interval — should now call updateTimestamp
      await act(async () => { vi.advanceTimersByTime(30000); });
      await act(async () => {});

      expect(mockProgressApi.updateTimestamp).toHaveBeenCalledWith('course-1', 'lesson-1', 45);
      expect(mockProgressApi.saveProgress).toHaveBeenCalledTimes(1); // still only once
    });

    it('does NOT auto-save when isPlaying is false', async () => {
      const videoRef = { current: { currentTime: 20, duration: 100 } } as Parameters<typeof useModuleProgress>[0]['videoRef'];

      renderHook(() =>
        useModuleProgress({
          courseId: 'course-1',
          activeLessonId: 'lesson-1',
          isPlaying: false,
          user: mockUser,
          videoRef,
          hasAccess: true,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(60000); // advance 2 full intervals
      });

      expect(mockProgressApi.saveProgress).not.toHaveBeenCalled();
      expect(mockProgressApi.updateTimestamp).not.toHaveBeenCalled();
    });
  });

  // ─── Resume position ─────────────────────────────────────────────────────

  it('sets pendingResumeRef when resume position is greater than 0', async () => {
    mockProgressApi.getResumePosition.mockResolvedValue(45);
    const videoRef = { current: { currentTime: 0, duration: 0 } } as Parameters<typeof useModuleProgress>[0]['videoRef'];

    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: false,
        user: mockUser,
        videoRef,
        hasAccess: true,
      })
    );

    await waitFor(() => expect(mockProgressApi.getResumePosition).toHaveBeenCalled());
    expect(result.current.pendingResumeRef.current).toBe(45);
  });

  // ─── checkCompletion guard and notification ───────────────────────────────

  it('guards against concurrent checkCompletion calls', async () => {
    // Make checkCompletion hang so the second call arrives while first is pending
    let resolveFirst!: (v: boolean) => void;
    mockProgressApi.checkCompletion.mockReturnValueOnce(
      new Promise<boolean>(r => { resolveFirst = r; })
    );

    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: true,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );

    act(() => {
      result.current.checkCompletion(96, 100);
      result.current.checkCompletion(97, 100); // second call while first is in-flight
    });

    resolveFirst(false);
    await waitFor(() => expect(mockProgressApi.checkCompletion).toHaveBeenCalledTimes(1));
  });

  it('shows completion notification then clears it after 3 seconds', async () => {
    vi.useFakeTimers();
    mockProgressApi.checkCompletion.mockResolvedValue(true);
    mockProgressApi.getCourseStats.mockResolvedValue({ overallPercent: 100 });

    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: true,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );

    // Trigger completion check and flush the async promise chain
    await act(async () => { result.current.checkCompletion(96, 100); });
    await act(async () => {}); // flush .then() callbacks

    expect(result.current.showCompletionNotification).toBe(true);

    // Advance past the 3s notification timeout
    await act(async () => { vi.advanceTimersByTime(3000); });

    expect(result.current.showCompletionNotification).toBe(false);
    vi.useRealTimers();
  });

  it('skips checkCompletion API call when lesson is already in lessonCompletionMap', async () => {
    vi.useRealTimers(); // ensure real timers — previous fake-timer tests may have left them active
    mockProgressApi.getProgress.mockResolvedValue([
      { lessonId: 'lesson-1', completed: true },
    ]);

    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeLessonId: 'lesson-1',
        isPlaying: true,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );

    await waitFor(() => expect(result.current.lessonCompletionMap['lesson-1']).toBe(true));

    act(() => {
      result.current.checkCompletion(96, 100); // past threshold but already completed
    });

    expect(mockProgressApi.checkCompletion).not.toHaveBeenCalled();
  });
});
