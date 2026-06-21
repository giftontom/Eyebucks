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

  it('returns empty notes by default', () => {
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeChapterId: 'm1', userId: 'u1' })
    );
    expect(result.current.notes).toBe('');
  });

  it('loads notes from localStorage', () => {
    localStorage.setItem('eyebuckz_notes_c1_m1', 'My saved notes');
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeChapterId: 'm1', userId: 'u1' })
    );
    expect(result.current.notes).toBe('My saved notes');
  });

  it('saves notes to localStorage after debounce', () => {
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeChapterId: 'm1', userId: 'u1' })
    );

    act(() => {
      result.current.setNotes('New note');
    });

    // Not saved yet (debounce)
    expect(localStorage.getItem('eyebuckz_notes_c1_m1')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem('eyebuckz_notes_c1_m1')).toBe('New note');
  });

  it('clears notes when switching modules', () => {
    localStorage.setItem('eyebuckz_notes_c1_m1', 'Notes for m1');
    const { result, rerender } = renderHook(
      ({ chapterId }) => useModuleNotes({ courseId: 'c1', activeChapterId: chapterId, userId: 'u1' }),
      { initialProps: { chapterId: 'm1' } }
    );

    expect(result.current.notes).toBe('Notes for m1');

    rerender({ chapterId: 'm2' });
    expect(result.current.notes).toBe('');
  });

  it('does not load notes without userId', () => {
    localStorage.setItem('eyebuckz_notes_c1_m1', 'Should not load');
    const { result } = renderHook(() =>
      useModuleNotes({ courseId: 'c1', activeChapterId: 'm1', userId: undefined })
    );
    expect(result.current.notes).toBe('');
  });
});
