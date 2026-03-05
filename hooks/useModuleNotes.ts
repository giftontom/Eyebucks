import { useState, useEffect, useRef } from 'react';

import { logger } from '../utils/logger';

interface UseModuleNotesInput {
  courseId?: string;
  activeChapterId?: string;
  userId?: string;
}

interface UseModuleNotesReturn {
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
}

export function useModuleNotes({ courseId, activeChapterId, userId }: UseModuleNotesInput): UseModuleNotesReturn {
  const [notes, setNotes] = useState('');
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes from localStorage when module changes
  useEffect(() => {
    if (!userId || !courseId || !activeChapterId) {return;}

    const notesKey = `eyebuckz_notes_${courseId}_${activeChapterId}`;
    const savedNotes = localStorage.getItem(notesKey);

    if (savedNotes) {
      setNotes(savedNotes);
    } else {
      setNotes('');
    }
  }, [userId, courseId, activeChapterId]);

  // Save notes to localStorage (debounced)
  useEffect(() => {
    if (!userId || !courseId || !activeChapterId) {return;}

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    notesTimeoutRef.current = setTimeout(() => {
      const notesKey = `eyebuckz_notes_${courseId}_${activeChapterId}`;
      localStorage.setItem(notesKey, notes);
      logger.debug(`[Notes] Saved for ${activeChapterId}`);
    }, 1000);

    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, [notes, userId, courseId, activeChapterId]);

  return { notes, setNotes };
}
