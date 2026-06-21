import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../utils/logger', () => ({
  logger: { debug: vi.fn() },
}));

import { useModuleNotes } from '../../../hooks/useModuleNotes';

describe('useModuleNotes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Hook parameter renamed: activeChapterId -> activeLessonId
  // localStorage key: eyebuckz_notes_{courseId}_{activeLessonId}

  it('returns empty notes by default', () => {
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeLessonId: 'l1', userId: 'u1' })
    );
    expect(result.current.notes).toBe('');
  });

  it('loads notes from localStorage', () => {
    localStorage.setItem('eyebuckz_notes_c1_l1', 'My saved notes');
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeLessonId: 'l1', userId: 'u1' })
    );
    expect(result.current.notes).toBe('My saved notes');
  });

  it('saves notes to localStorage after debounce', () => {
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeLessonId: 'l1', userId: 'u1' })
    );

    act(() => {
      result.current.setNotes('New note');
    });

    // Not saved yet (debounce)
    expect(localStorage.getItem('eyebuckz_notes_c1_l1')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem('eyebuckz_notes_c1_l1')).toBe('New note');
  });

  it('clears notes when switching lessons', () => {
    localStorage.setItem('eyebuckz_notes_c1_l1', 'Notes for l1');
    const { result, rerender } = renderHook(
      ({ lessonId }) => useModuleNotes({ courseId: 'c1', activeLessonId: lessonId, userId: 'u1' }),
      { initialProps: { lessonId: 'l1' } }
    );

    expect(result.current.notes).toBe('Notes for l1');

    rerender({ lessonId: 'l2' });
    expect(result.current.notes).toBe('');
  });

  it('does not load notes without userId', () => {
    localStorage.setItem('eyebuckz_notes_c1_l1', 'Should not load');
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeLessonId: 'l1', userId: undefined })
    );
    expect(result.current.notes).toBe('');
  });

  it('migrates legacy per-module notes to new per-lesson key on first read', () => {
    // Legacy key: eyebuckz_notes_{courseId}_{moduleId} (without -l1 suffix)
    // New key: eyebuckz_notes_{courseId}_{lessonId}  (lessonId = moduleId + '-l1')
    localStorage.setItem('eyebuckz_notes_c1_m1', 'Legacy module note');
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeLessonId: 'm1-l1', userId: 'u1' })
    );
    // Should have migrated the legacy note into the new key
    expect(result.current.notes).toBe('Legacy module note');
    // Old key removed, new key written
    expect(localStorage.getItem('eyebuckz_notes_c1_m1')).toBeNull();
    expect(localStorage.getItem('eyebuckz_notes_c1_m1-l1')).toBe('Legacy module note');
  });
});
