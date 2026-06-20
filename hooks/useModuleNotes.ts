import { useState, useEffect, useRef } from 'react';

import { logger } from '../utils/logger';

interface UseModuleNotesInput {
  courseId?: string;
  /** The active LESSON id — notes are now kept per-lesson. */
  activeLessonId?: string;
  userId?: string;
}

interface UseModuleNotesReturn {
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
}

export function useModuleNotes({ courseId, activeLessonId, userId }: UseModuleNotesInput): UseModuleNotesReturn {
  const [notes, setNotes] = useState('');
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes from localStorage when the active lesson changes
  useEffect(() => {
    if (!userId || !courseId || !activeLessonId) {return;}

    const notesKey = `eyebuckz_notes_${courseId}_${activeLessonId}`;
    let savedNotes = localStorage.getItem(notesKey);

    // One-time migration: notes used to be keyed per-module. After the auto-wrap,
    // a module `m1`'s note belongs to lesson `m1-l1`, so read-through the old key.
    if (savedNotes === null) {
      const legacyKey = `eyebuckz_notes_${courseId}_${activeLessonId.replace(/-l1$/, '')}`;
      if (legacyKey !== notesKey) {
        const legacyNotes = localStorage.getItem(legacyKey);
        if (legacyNotes !== null) {
          savedNotes = legacyNotes;
          localStorage.setItem(notesKey, legacyNotes);
          localStorage.removeItem(legacyKey);
        }
      }
    }

    setNotes(savedNotes || '');
  }, [userId, courseId, activeLessonId]);

  // Save notes to localStorage (debounced)
  useEffect(() => {
    if (!userId || !courseId || !activeLessonId) {return;}

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    notesTimeoutRef.current = setTimeout(() => {
      const notesKey = `eyebuckz_notes_${courseId}_${activeLessonId}`;
      localStorage.setItem(notesKey, notes);
      logger.debug(`[Notes] Saved for ${activeLessonId}`);
    }, 1000);

    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, [notes, userId, courseId, activeLessonId]);

  return { notes, setNotes };
}
