import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../services/api', () => ({
  progressApi: {
    getProgress: vi.fn(),
    getCourseStats: vi.fn(),
    getResumePosition: vi.fn(),
    updateCurrentModule: vi.fn(),
    saveProgress: vi.fn(),
    updateTimestamp: vi.fn(),
    checkCompletion: vi.fn(),
  },
  AUTO_SAVE_INTERVAL: 30000,
}));
vi.mock('../../../utils/analytics', () => ({
  analytics: { track: vi.fn() },
}));

import { progressApi } from '../../../services/api';
import { analytics } from '../../../utils/analytics';
import { useModuleProgress } from '../../../hooks/useModuleProgress';

const mockProgressApi = progressApi as Record<string, ReturnType<typeof vi.fn>>;

const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'USER' as const };
const mockVideoRef = { current: { currentTime: 0, duration: 100 } } as Parameters<typeof useModuleProgress>[0]['videoRef'];

describe('useModuleProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgressApi.getProgress.mockResolvedValue([]);
    mockProgressApi.getCourseStats.mockResolvedValue({ overallPercent: 0 });
    mockProgressApi.getResumePosition.mockResolvedValue(0);
    mockProgressApi.updateCurrentModule.mockResolvedValue(undefined);
    mockProgressApi.checkCompletion.mockResolvedValue(false);
  });

  it('loads completion map on mount', async () => {
    mockProgressApi.getProgress.mockResolvedValue([
      { moduleId: 'mod-1', completed: true },
      { moduleId: 'mod-2', completed: false },
    ]);
    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeChapterId: 'mod-1',
        isPlaying: false,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );
    await waitFor(() => expect(result.current.moduleCompletionMap['mod-1']).toBe(true));
    expect(result.current.moduleCompletionMap['mod-2']).toBe(false);
  });

  it('loads course progress stats on mount', async () => {
    mockProgressApi.getCourseStats.mockResolvedValue({ overallPercent: 65 });
    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeChapterId: 'mod-1',
        isPlaying: false,
        user: mockUser,
        videoRef: mockVideoRef,
        hasAccess: true,
      })
    );
    await waitFor(() => expect(result.current.progressPercent).toBe(65));
  });

  it('fires module_completed analytics event when module is completed', async () => {
    mockProgressApi.checkCompletion.mockResolvedValue(true);
    mockProgressApi.getCourseStats.mockResolvedValue({ overallPercent: 100 });

    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeChapterId: 'mod-1',
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
      expect(analytics.track).toHaveBeenCalledWith('module_completed', {
        course_id: 'course-1',
        module_id: 'mod-1',
      })
    );
  });

  it('does not fire completion when threshold not met', async () => {
    const { result } = renderHook(() =>
      useModuleProgress({
        courseId: 'course-1',
        activeChapterId: 'mod-1',
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
        activeChapterId: 'mod-1',
        isPlaying: false,
        user: null,
        videoRef: mockVideoRef,
        hasAccess: false,
      })
    );
    await new Promise(r => setTimeout(r, 50));
    expect(mockProgressApi.getProgress).not.toHaveBeenCalled();
  });
});
