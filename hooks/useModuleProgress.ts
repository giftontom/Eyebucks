import { useState, useEffect, useRef, useCallback } from 'react';

import { progressApi, AUTO_SAVE_INTERVAL } from '../services/api';
import { logger } from '../utils/logger';

import type { VideoPlayerHandle } from '../components/VideoPlayer';
import type { User } from '@supabase/supabase-js';

interface UseModuleProgressInput {
  courseId?: string;
  activeChapterId?: string;
  isPlaying: boolean;
  user: User | null;
  videoRef: React.RefObject<VideoPlayerHandle | null>;
  hasAccess: boolean;
}

interface UseModuleProgressReturn {
  progressPercent: number;
  moduleCompletionMap: Record<string, boolean>;
  showCompletionNotification: boolean;
  pendingResumeRef: React.RefObject<number>;
  checkCompletion: (currentTime: number, duration: number) => void;
}

export function useModuleProgress({
  courseId,
  activeChapterId,
  isPlaying,
  user,
  videoRef,
  hasAccess,
}: UseModuleProgressInput): UseModuleProgressReturn {
  const [progressPercent, setProgressPercent] = useState(0);
  const [moduleCompletionMap, setModuleCompletionMap] = useState<Record<string, boolean>>({});
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);

  const completionCheckingRef = useRef(false);
  const pendingResumeRef = useRef<number>(0);
  const viewIncrementedRef = useRef<Set<string>>(new Set());
  const completionNotifRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-load module completion statuses
  useEffect(() => {
    const loadModuleCompletions = async () => {
      if (!user || !courseId) {return;}

      try {
        const allProgress = await progressApi.getProgress(courseId);
        const completionMap: Record<string, boolean> = {};
        for (const p of allProgress) {
          completionMap[p.moduleId] = p.completed;
        }
        setModuleCompletionMap(completionMap);
      } catch (error) {
        logger.error('[Progress] Error loading module completions:', error);
      }
    };

    loadModuleCompletions();
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

  // Load resume position when module changes
  useEffect(() => {
    if (!user || !courseId || !activeChapterId || !hasAccess) {return;}
    pendingResumeRef.current = 0;

    const loadResumePosition = async () => {
      try {
        const resumePosition = await progressApi.getResumePosition(courseId, activeChapterId);

        if (resumePosition > 0) {
          pendingResumeRef.current = resumePosition;
          if (videoRef.current && videoRef.current.duration > 0) {
            videoRef.current.currentTime = resumePosition;
            logger.debug(`[Progress] Resumed ${activeChapterId} at ${resumePosition}s (immediate)`);
          }
        }

        await progressApi.updateCurrentModule(courseId, activeChapterId);
      } catch (error) {
        logger.error('[Progress] Error loading resume position:', error);
      }
    };

    loadResumePosition();
  }, [activeChapterId, user, courseId, hasAccess, videoRef]);

  // Auto-save every 30s when playing
  useEffect(() => {
    const saveProgress = () => {
      if (!videoRef.current || !user || !courseId || !activeChapterId) {return;}

      const timestamp = Math.floor(videoRef.current.currentTime);
      const alreadyIncremented = viewIncrementedRef.current.has(activeChapterId);

      const savePromise = alreadyIncremented
        ? progressApi.updateTimestamp(courseId, activeChapterId, timestamp)
        : progressApi.saveProgress(courseId, activeChapterId, timestamp);

      savePromise
        .then(() => {
          if (!alreadyIncremented) {
            viewIncrementedRef.current.add(activeChapterId);
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
  }, [isPlaying, activeChapterId, user, courseId, videoRef]);

  // Clean up completion notification timeout on unmount
  useEffect(() => {
    return () => {
      if (completionNotifRef.current) {clearTimeout(completionNotifRef.current);}
    };
  }, []);

  const checkCompletion = useCallback((currentTime: number, duration: number) => {
    if (!user || !courseId || !activeChapterId) {return;}

    // Skip if already completed or not past 95%
    if (moduleCompletionMap[activeChapterId]) {return;}
    if (!duration || duration <= 0 || currentTime / duration < 0.95) {return;}

    // Guard against concurrent async calls
    if (completionCheckingRef.current) {return;}
    completionCheckingRef.current = true;

    progressApi.checkCompletion(courseId, activeChapterId, currentTime, duration)
      .then((wasCompleted) => {
        if (wasCompleted) {
          setModuleCompletionMap(prev => ({ ...prev, [activeChapterId]: true }));

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
  }, [user, courseId, activeChapterId, moduleCompletionMap]);

  return {
    progressPercent,
    moduleCompletionMap,
    showCompletionNotification,
    pendingResumeRef,
    checkCompletion,
  };
}
