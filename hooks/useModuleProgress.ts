import { useState, useEffect, useRef, useCallback } from 'react';

import { progressApi, AUTO_SAVE_INTERVAL } from '../services/api';
import { analytics } from '../utils/analytics';
import { logger } from '../utils/logger';

import type { VideoPlayerHandle } from '../components/VideoPlayer';
import type { User } from '../types';

interface UseModuleProgressInput {
  courseId?: string;
  /** The currently active LESSON (video leaf) being watched. */
  activeLessonId?: string;
  isPlaying: boolean;
  user: User | null;
  videoRef: React.RefObject<VideoPlayerHandle | null>;
  hasAccess: boolean;
}

interface UseModuleProgressReturn {
  progressPercent: number;
  /** `Record<lessonId, boolean>` of completed lessons. Derive module roll-up in the UI. */
  lessonCompletionMap: Record<string, boolean>;
  showCompletionNotification: boolean;
  pendingResumeRef: React.RefObject<number>;
  checkCompletion: (currentTime: number, duration: number) => void;
}

/**
 * Tracks and persists video watch progress for a course, at LESSON granularity.
 *
 * On mount (when `courseId` changes), loads all lesson completion statuses and the
 * overall course completion percentage. When `activeLessonId` changes, loads the resume
 * position for that lesson and sets it on the video element.
 *
 * While `isPlaying` is true, auto-saves progress every `AUTO_SAVE_INTERVAL` (30 seconds).
 * The first save of a session calls `progressApi.saveProgress()` (increments `view_count`);
 * subsequent saves call `progressApi.updateTimestamp()`.
 *
 * `checkCompletion()` is an imperative trigger called by the Learn page at the 95%
 * watch threshold. It guards against concurrent calls with `completionCheckingRef`.
 * A module/chapter is "complete" when all its lessons are complete — derive that in the UI
 * from `lessonCompletionMap`.
 *
 * @returns Object with `progressPercent`, `lessonCompletionMap`, `showCompletionNotification`,
 *   `pendingResumeRef`, and `checkCompletion`.
 */
export function useModuleProgress({
  courseId,
  activeLessonId,
  isPlaying,
  user,
  videoRef,
  hasAccess,
}: UseModuleProgressInput): UseModuleProgressReturn {
  const [progressPercent, setProgressPercent] = useState(0);
  const [lessonCompletionMap, setLessonCompletionMap] = useState<Record<string, boolean>>({});
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);

  const completionCheckingRef = useRef(false);
  const pendingResumeRef = useRef<number>(0);
  const viewIncrementedRef = useRef<Set<string>>(new Set());
  const completionNotifRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-load lesson completion statuses
  useEffect(() => {
    const loadLessonCompletions = async () => {
      if (!user || !courseId) {return;}

      try {
        const allProgress = await progressApi.getProgress(courseId);
        const completionMap: Record<string, boolean> = {};
        for (const p of allProgress) {
          completionMap[p.lessonId] = p.completed;
        }
        setLessonCompletionMap(completionMap);
      } catch (error) {
        logger.error('[Progress] Error loading lesson completions:', error);
      }
    };

    loadLessonCompletions();
  }, [user, courseId]);

  // Load course progress stats
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !courseId) {
        setProgressPercent(0);
        return;
      }

      try {
        const stats = await progressApi.getCourseStats(courseId);
        setProgressPercent(stats.overallPercent);
      } catch (error) {
        logger.error('[Progress] Error loading course stats:', error);
      }
    };

    loadProgress();
  }, [user, courseId]);

  // Load resume position when the active lesson changes
  useEffect(() => {
    if (!user || !courseId || !activeLessonId || !hasAccess) {return;}
    pendingResumeRef.current = 0;

    const loadResumePosition = async () => {
      try {
        const resumePosition = await progressApi.getResumePosition(courseId, activeLessonId);

        if (resumePosition > 0) {
          pendingResumeRef.current = resumePosition;
          if (videoRef.current && videoRef.current.duration > 0) {
            videoRef.current.currentTime = resumePosition;
            logger.debug(`[Progress] Resumed ${activeLessonId} at ${resumePosition}s (immediate)`);
          }
        }

        await progressApi.updateCurrentLesson(courseId, activeLessonId);
      } catch (error) {
        logger.error('[Progress] Error loading resume position:', error);
      }
    };

    loadResumePosition();
  }, [activeLessonId, user, courseId, hasAccess, videoRef]);

  // Auto-save every 30s when playing
  useEffect(() => {
    const saveProgress = () => {
      if (!videoRef.current || !user || !courseId || !activeLessonId) {return;}

      const timestamp = Math.floor(videoRef.current.currentTime);
      const alreadyIncremented = viewIncrementedRef.current.has(activeLessonId);

      const savePromise = alreadyIncremented
        ? progressApi.updateTimestamp(courseId, activeLessonId, timestamp)
        : progressApi.saveProgress(courseId, activeLessonId, timestamp);

      savePromise
        .then(() => {
          if (!alreadyIncremented) {
            viewIncrementedRef.current.add(activeLessonId);
          }
        })
        .catch((err) => {
          logger.error('[Progress] Save failed:', err);
        });
    };

    const interval = setInterval(() => {
      if (isPlaying) {saveProgress();}
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [isPlaying, activeLessonId, user, courseId, videoRef]);

  // Clean up completion notification timeout on unmount
  useEffect(() => {
    return () => {
      if (completionNotifRef.current) {clearTimeout(completionNotifRef.current);}
    };
  }, []);

  const checkCompletion = useCallback((currentTime: number, duration: number) => {
    if (!user || !courseId || !activeLessonId) {return;}

    // Skip if already completed or not past 95%
    if (lessonCompletionMap[activeLessonId]) {return;}
    if (!duration || duration <= 0 || currentTime / duration < 0.95) {return;}

    // Guard against concurrent async calls
    if (completionCheckingRef.current) {return;}
    completionCheckingRef.current = true;

    progressApi.checkCompletion(courseId, activeLessonId, currentTime, duration)
      .then((wasCompleted) => {
        if (wasCompleted) {
          analytics.track('lesson_completed', {
            course_id: courseId,
            lesson_id: activeLessonId,
          });
          setLessonCompletionMap(prev => ({ ...prev, [activeLessonId]: true }));

          setShowCompletionNotification(true);
          if (completionNotifRef.current) {clearTimeout(completionNotifRef.current);}
          completionNotifRef.current = setTimeout(() => setShowCompletionNotification(false), 3000);

          progressApi.getCourseStats(courseId).then(stats => {
            setProgressPercent(stats.overallPercent);
          });
        }
      })
      .catch(err => {
        logger.error('[Progress] Completion check failed:', err);
      })
      .finally(() => {
        completionCheckingRef.current = false;
      });
  }, [user, courseId, activeLessonId, lessonCompletionMap]);

  return {
    progressPercent,
    lessonCompletionMap,
    showCompletionNotification,
    pendingResumeRef,
    checkCompletion,
  };
}
