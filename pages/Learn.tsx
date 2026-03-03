import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Circle, Play, Pause, Maximize, Volume2, VolumeX, SkipBack, SkipForward, Edit3, Film, Loader2, BookOpen, Layers, ArrowRight, ChevronUp, X, PictureInPicture2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessControl } from '../hooks/useAccessControl';
import { coursesApi, progressApi, AUTO_SAVE_INTERVAL } from '../services/api';
import { useToast } from '../components/Toast';
import { EnrollmentGate } from '../components/EnrollmentGate';
import { VideoPlayer, VideoPlayerHandle } from '../components/VideoPlayer';
import type { QualityLevel } from '../components/VideoPlayer';
import { logger } from '../utils/logger';
import { CourseType } from '../types';
import type { Course, Module } from '../types';

/**
 * Extract Bunny Stream video GUID from a video URL
 * Bunny URLs follow: https://{cdn}/{guid}/playlist.m3u8
 */
function extractVideoId(videoUrl?: string): string | undefined {
  if (!videoUrl) return undefined;
  const match = videoUrl.match(/\/([a-f0-9-]{36})\/playlist\.m3u8/i);
  return match?.[1];
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const Learn: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();

  // Fetch course and modules from API
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);

  // Use access control hook
  const { hasAccess, isLoading: isCheckingAccess, isAdmin } = useAccessControl(id);
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [notes, setNotes] = useState('');
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Mobile responsiveness
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [doubleTapIndicator, setDoubleTapIndicator] = useState<{ side: 'left' | 'right'; key: number } | null>(null);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | null>(null);
  const [seekPreviewX, setSeekPreviewX] = useState(0);
  const doubleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  // Playback speed
  const [playbackRate, setPlaybackRate] = useState(1);

  // HLS quality
  const [hlsQuality, setHlsQuality] = useState<string | null>(null);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Reset quality state when switching modules (HLS reinitializes in auto mode)
  useEffect(() => {
    setQualityLevels([]);
    setSelectedQuality(-1);
    setShowQualityMenu(false);
  }, [activeChapterId]);

  // Buffered amount
  const [bufferedEnd, setBufferedEnd] = useState(0);

  const videoRef = useRef<VideoPlayerHandle>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionCheckingRef = useRef(false);

  const activeChapterIndex = modules.findIndex(m => m.id === activeChapterId) ?? 0;

  // Calculate real progress from progressService
  const [progressPercent, setProgressPercent] = useState(0);

  // Pre-loaded module completion status (async data loaded into sync map)
  const [moduleCompletionMap, setModuleCompletionMap] = useState<Record<string, boolean>>({});

  // Load course and modules from API (parallelized)
  useEffect(() => {
    const loadCourse = async () => {
      if (!id) return;

      try {
        setIsLoadingCourse(true);

        const [courseResponse, modulesResponse] = await Promise.all([
          coursesApi.getCourse(id),
          coursesApi.getCourseModules(id),
        ]);

        setCourse(courseResponse.course);
        setModules(modulesResponse.modules || []);

        // Set first module as active by default
        if (modulesResponse.modules && modulesResponse.modules.length > 0) {
          setActiveChapterId(modulesResponse.modules[0].id);
        }
      } catch (error) {
        logger.error('[Learn] Error loading course:', error);
        showToast('Failed to load course', 'error');
      } finally {
        setIsLoadingCourse(false);
      }
    };

    loadCourse();
  }, [id, showToast]);

  // Pre-load module completion statuses
  useEffect(() => {
    const loadModuleCompletions = async () => {
      if (!user || !id || modules.length === 0) return;

      try {
        const allProgress = await progressApi.getProgress(id);
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
  }, [user, id, modules.length]);

  // Load course progress stats
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !id) {
        setProgressPercent(0);
        return;
      }

      try {
        const stats = await progressApi.getCourseStats(id);
        setProgressPercent(stats.overallPercent);
      } catch (error) {
        logger.error('[Progress] Error loading course stats:', error);
      }
    };

    loadProgress();
  }, [user, id]);

  // Load resume position when module changes
  useEffect(() => {
    if (!user || !id || !activeChapterId || !videoRef.current || !hasAccess) return;

    const loadResumePosition = async () => {
      try {
        const resumePosition = await progressApi.getResumePosition(id, activeChapterId);

        if (resumePosition > 0 && videoRef.current) {
          videoRef.current.currentTime = resumePosition;
          logger.debug(`[Progress] Resumed ${activeChapterId} at ${resumePosition}s`);
        }

        // Update current module in enrollment
        await progressApi.updateCurrentModule(id, activeChapterId);
      } catch (error) {
        logger.error('[Progress] Error loading resume position:', error);
      }
    };

    loadResumePosition();
  }, [activeChapterId, user, id, hasAccess]);

  // Sync playback rate when switching modules
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [activeChapterId, playbackRate]);

  // Load notes from localStorage when module changes
  useEffect(() => {
    if (!user || !id || !activeChapterId) return;

    const notesKey = `eyebuckz_notes_${id}_${activeChapterId}`;
    const savedNotes = localStorage.getItem(notesKey);

    if (savedNotes) {
      setNotes(savedNotes);
    } else {
      setNotes('');
    }
  }, [user, id, activeChapterId]);

  // Save notes to localStorage (debounced)
  useEffect(() => {
    if (!user || !id || !activeChapterId) return;

    // Clear previous timeout
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    // Debounce save by 1 second
    notesTimeoutRef.current = setTimeout(() => {
      const notesKey = `eyebuckz_notes_${id}_${activeChapterId}`;
      localStorage.setItem(notesKey, notes);
      logger.debug(`[Notes] Saved for ${activeChapterId}`);
    }, 1000);

    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, [notes, user, id, activeChapterId]);

  // Module 3: Progress Save Logic (Auto-save every 30s)
  useEffect(() => {
    const saveProgress = () => {
      if (!videoRef.current || !user || !id || !activeChapterId) return;

      const timestamp = Math.floor(videoRef.current.currentTime);
      progressApi.saveProgress(id, activeChapterId, timestamp);

      // Show subtle toast notification
      showToast('Progress saved ✓', 'success', 2000);
    };

    const interval = setInterval(() => {
      if (isPlaying) saveProgress();
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [isPlaying, activeChapterId, user, id, showToast]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration);

    // Update buffered amount
    setBufferedEnd(videoRef.current.buffered);

    // Check for module completion (95% threshold)
    if (user && id && activeChapterId) {
      const ct = videoRef.current.currentTime;
      const dur = videoRef.current.duration;

      // Pre-check: skip if already completed or not past 95%
      if (moduleCompletionMap[activeChapterId]) return;
      if (!dur || dur <= 0 || ct / dur < 0.95) return;

      // Guard against concurrent async calls
      if (completionCheckingRef.current) return;
      completionCheckingRef.current = true;

      progressApi.checkCompletion(id, activeChapterId, ct, dur)
        .then((wasCompleted) => {
          if (wasCompleted) {
            // Immediately mark in map to prevent re-triggering
            setModuleCompletionMap(prev => ({ ...prev, [activeChapterId]: true }));

            // Show completion notification
            setShowCompletionNotification(true);
            if (completionNotifRef.current) clearTimeout(completionNotifRef.current);
            completionNotifRef.current = setTimeout(() => setShowCompletionNotification(false), 3000);

            // Reload progress stats
            progressApi.getCourseStats(id).then(stats => {
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
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullScreen = () => {
      if (!document.fullscreenElement) {
          videoRef.current?.parentElement?.requestFullscreen();
      } else {
          document.exitFullscreen();
      }
  };

  const cycleSpeed = useCallback(() => {
    setPlaybackRate(prev => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
      if (videoRef.current) videoRef.current.playbackRate = next;
      return next;
    });
  }, []);

  const adjustSpeed = useCallback((direction: 'up' | 'down') => {
    setPlaybackRate(prev => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      let nextIdx: number;
      if (direction === 'up') {
        nextIdx = Math.min(idx + 1, SPEED_OPTIONS.length - 1);
      } else {
        nextIdx = Math.max(idx - 1, 0);
      }
      const next = SPEED_OPTIONS[nextIdx];
      if (videoRef.current) videoRef.current.playbackRate = next;
      return next;
    });
  }, []);

  // Previous / Next Chapter Logic
  const handlePrev = () => {
      if (activeChapterIndex > 0) {
          setActiveChapterId(modules[activeChapterIndex - 1].id);
          setIsPlaying(false);
      }
  };

  const handleNext = () => {
      if (activeChapterIndex < modules.length - 1) {
          setActiveChapterId(modules[activeChapterIndex + 1].id);
          setIsPlaying(false);
      }
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
    };
  }, []);

  const completionNotifRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up completion notification timeout on unmount
  useEffect(() => {
    return () => {
      if (completionNotifRef.current) clearTimeout(completionNotifRef.current);
    };
  }, []);

  const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }

  const handleTouchInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  };

  const handleVideoTap = (e: React.MouseEvent | React.TouchEvent) => {
    setShowQualityMenu(false);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const tapX = clientX - rect.left;
    const isLeftHalf = tapX < rect.width / 2;
    const now = Date.now();

    if (lastTapRef.current && now - lastTapRef.current.time < 300) {
      // Double-tap detected
      if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
      if (videoRef.current) {
        if (isLeftHalf) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          setDoubleTapIndicator({ side: 'left', key: now });
        } else {
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          setDoubleTapIndicator({ side: 'right', key: now });
        }
        setTimeout(() => setDoubleTapIndicator(null), 600);
      }
      lastTapRef.current = null;
      return;
    }

    lastTapRef.current = { time: now, x: tapX };
    doubleTapTimeoutRef.current = setTimeout(() => {
      // Single tap → toggle play/pause
      handlePlayPause();
      lastTapRef.current = null;
    }, 300);
  };

  const togglePiP = async () => {
    if (videoRef.current) {
      await videoRef.current.requestPiP();
    }
  };

  const handleSeekHover = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = (clientX - rect.left) / rect.width;
    const time = percent * (duration || 0);
    setSeekPreviewTime(time);
    setSeekPreviewX(clientX - rect.left);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!videoRef.current) return;
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        handlePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        { const newVol = Math.min(1, (videoRef.current.volume || 0) + 0.1);
          videoRef.current.volume = newVol;
          setVolume(newVol);
          setIsMuted(newVol === 0); }
        break;
      case 'ArrowDown':
        e.preventDefault();
        { const newVol = Math.max(0, (videoRef.current.volume || 0) - 0.1);
          videoRef.current.volume = newVol;
          setVolume(newVol);
          setIsMuted(newVol === 0); }
        break;
      case 'f':
        e.preventDefault();
        toggleFullScreen();
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case '<':
        e.preventDefault();
        adjustSpeed('down');
        break;
      case '>':
        e.preventDefault();
        adjustSpeed('up');
        break;
      case 'q':
        e.preventDefault();
        setShowQualityMenu(prev => !prev);
        break;
    }
  };

  const handleVideoError = (error: string) => {
    setVideoError(error);
    showToast(error, 'error', 5000);
    setIsPlaying(false);
  }

  const retryVideo = async () => {
    setVideoError(null);
    if (videoRef.current) {
      await videoRef.current.refreshUrl();
      videoRef.current.load();
    }
  }

  const handleQualityChange = useCallback((quality: string) => {
    setHlsQuality(quality);
  }, []);

  const handleLevelsLoaded = useCallback((levels: QualityLevel[]) => {
    setQualityLevels(levels);
  }, []);

  const handleSelectQuality = useCallback((index: number) => {
    setSelectedQuality(index);
    setShowQualityMenu(false);
    if (videoRef.current) {
      videoRef.current.setQualityLevel(index);
    }
  }, []);

  // Loading course data
  if (isLoadingCourse || isCheckingAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-brand-600 mx-auto mb-4" />
          <p className="text-neutral-600">
            {isLoadingCourse ? 'Loading course...' : 'Verifying access...'}
          </p>
        </div>
      </div>
    );
  }

  // Course not found
  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Course not found</h2>
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-medium">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // Show enrollment gate if user doesn't have access
  if (!hasAccess) {
    return (
      <EnrollmentGate
        courseId={course.id}
        courseTitle={course.title}
        coursePrice={course.price}
        courseThumbnail={course.thumbnail}
        courseDescription={course.description}
        totalModules={modules.length}
      />
    );
  }

  // Bundle Hub View — bundles don't have modules, show linked courses instead
  if (course.type === CourseType.BUNDLE) {
    const bundledCourses = course.bundledCourses || [];
    return (
      <div className="min-h-[calc(100vh-64px)] bg-neutral-950">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-brand-600/20 text-brand-400 text-xs font-bold px-3 py-1 rounded-full border border-brand-500/30">
                <Layers size={12} className="inline mr-1" /> BUNDLE
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
            <p className="text-neutral-400">{course.description}</p>
          </div>

          {/* Overall progress */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
            <div className="flex justify-between text-sm text-neutral-400 mb-2">
              <span>{bundledCourses.length} Courses in this Bundle</span>
              <span>{Math.round(progressPercent)}% Overall</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-600 to-purple-500 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Bundled course cards */}
          <div className="space-y-4">
            {bundledCourses.map((bc, index) => (
              <Link
                key={bc.id}
                to={`/learn/${bc.id}`}
                className="flex gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-brand-500/40 hover:bg-neutral-800/50 transition group"
              >
                <div className="w-24 h-16 md:w-32 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                  {bc.thumbnail ? (
                    <img src={bc.thumbnail} alt={bc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <BookOpen size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Course {index + 1}</span>
                  <h3 className="font-bold text-white group-hover:text-brand-400 transition truncate">{bc.title}</h3>
                  <p className="text-sm text-neutral-500 line-clamp-1 mt-1">{bc.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                    <span>{bc.moduleCount} Lessons</span>
                  </div>
                </div>
                <div className="hidden md:flex items-center text-neutral-600 group-hover:text-brand-500 transition">
                  <ArrowRight size={20} />
                </div>
              </Link>
            ))}
          </div>

          {bundledCourses.length === 0 && (
            <div className="text-center py-16">
              <p className="text-neutral-500 mb-4">No courses have been added to this bundle yet.</p>
              <Link to="/" className="text-brand-500 hover:text-brand-400 font-medium">Back to Catalog</Link>
            </div>
          )}
        </div>
        <ToastContainer />
      </div>
    );
  }

  // No modules available (for MODULE courses only)
  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No modules available</h2>
          <p className="text-neutral-400 mb-4">This course doesn't have any modules yet.</p>
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-medium">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const activeModule = modules[activeChapterIndex];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-80px)] overflow-hidden bg-black">

      {/* Main Video Player Area */}
      <div className="flex-grow flex flex-col h-full overflow-y-auto relative">
        <div
            className="relative w-full aspect-video bg-black group flex-shrink-0 outline-none select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
            onTouchStart={handleTouchInteraction}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
            tabIndex={0}
        >
            <VideoPlayer
                ref={videoRef}
                videoId={extractVideoId(activeModule?.videoUrl)}
                moduleId={activeModule?.id}
                fallbackUrl={activeModule?.videoUrl || ''}
                className="w-full h-full"
                controls={false}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onError={handleVideoError}
                onQualityChange={handleQualityChange}
                onLevelsLoaded={handleLevelsLoaded}
            />

            {/* Tap overlay for play/pause + double-tap skip */}
            <div
              className="absolute inset-0 z-10"
              onClick={handleVideoTap}
              onTouchEnd={handleVideoTap}
            />

            {/* Double-tap skip indicators */}
            {doubleTapIndicator?.side === 'left' && (
              <div key={doubleTapIndicator.key} className="absolute left-0 inset-y-0 w-1/3 flex items-center justify-center pointer-events-none z-20 animate-fade-in">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 flex flex-col items-center">
                  <SkipBack size={28} className="text-white" />
                  <span className="text-white text-xs font-bold">10s</span>
                </div>
              </div>
            )}
            {doubleTapIndicator?.side === 'right' && (
              <div key={doubleTapIndicator.key} className="absolute right-0 inset-y-0 w-1/3 flex items-center justify-center pointer-events-none z-20 animate-fade-in">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 flex flex-col items-center">
                  <SkipForward size={28} className="text-white" />
                  <span className="text-white text-xs font-bold">10s</span>
                </div>
              </div>
            )}

            {/* Custom Controls Overlay */}
            <div
                className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 z-20 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Seek Bar with Buffered Indicator + Preview */}
                <div className="mb-3 sm:mb-4 relative group/seek py-2 sm:py-0">
                    {/* Seek preview tooltip */}
                    {seekPreviewTime !== null && (
                      <div
                        className="absolute -top-8 bg-black/80 text-white text-[10px] font-mono px-2 py-1 rounded pointer-events-none"
                        style={{ left: `${seekPreviewX}px`, transform: 'translateX(-50%)' }}
                      >
                        {Math.floor(seekPreviewTime / 60)}:{Math.floor(seekPreviewTime % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                    <div className="h-1 sm:h-1 active:h-2 w-full bg-gray-600 rounded-lg overflow-hidden transition-all">
                        {/* Buffered bar (gray) */}
                        <div className="absolute h-1 bg-gray-400/40 rounded-lg" style={{ width: `${(bufferedEnd / (duration || 1)) * 100}%` }}></div>
                        {/* Playback bar (brand color) */}
                        <div className="relative h-full bg-brand-500" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        onMouseMove={handleSeekHover}
                        onTouchMove={handleSeekHover}
                        onMouseLeave={() => setSeekPreviewTime(null)}
                        onTouchEnd={() => setSeekPreviewTime(null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Seek video"
                    />
                </div>

                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Skip prev — hidden on mobile (double-tap replaces it) */}
                        <button onClick={handlePrev} className="hidden sm:block p-2 hover:text-brand-500 transition disabled:opacity-50" disabled={activeChapterIndex === 0} aria-label="Previous module">
                            <SkipBack size={20} fill="currentColor" />
                        </button>

                        <button onClick={handlePlayPause} className="p-2 hover:text-brand-500 transition" aria-label={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" fill="currentColor" /> : <Play size={20} className="sm:w-6 sm:h-6" fill="currentColor" />}
                        </button>

                        {/* Skip next — hidden on mobile */}
                        <button onClick={handleNext} className="hidden sm:block p-2 hover:text-brand-500 transition disabled:opacity-50" disabled={activeChapterIndex === modules.length - 1} aria-label="Next module">
                            <SkipForward size={20} fill="currentColor" />
                        </button>

                        {/* Volume — hidden on mobile (users use hardware volume) */}
                        <div className="hidden sm:flex items-center gap-2 group/vol pl-4 border-l border-gray-700 ml-4">
                            <button onClick={toggleMute} className="p-2" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                                <input
                                    type="range" min="0" max="1" step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setVolume(v);
                                        if(videoRef.current) videoRef.current.volume = v;
                                        setIsMuted(v === 0);
                                    }}
                                    className="w-20 h-1 accent-white"
                                    aria-label="Volume"
                                />
                            </div>
                        </div>

                        {/* Time — compact on mobile */}
                        <span className="text-[10px] sm:text-xs font-mono text-gray-300">
                            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} /
                            {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Speed Control */}
                        <button
                          onClick={cycleSpeed}
                          className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded hover:bg-white/20 transition min-w-[2.5rem] sm:min-w-[3rem]"
                          title="Playback speed (< / > keys)"
                        >
                          {playbackRate}x
                        </button>

                        {/* Quality Selector — hidden on mobile and Safari (native HLS) */}
                        {qualityLevels.length > 0 && (
                          <div className="hidden sm:block relative">
                            <button
                              onClick={() => setShowQualityMenu(prev => !prev)}
                              className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded hover:bg-white/20 transition min-w-[3rem]"
                              title="Video quality (q key)"
                            >
                              {selectedQuality === -1
                                ? `Auto${hlsQuality ? ` (${hlsQuality})` : ''}`
                                : qualityLevels.find(l => l.index === selectedQuality)?.label || hlsQuality}
                            </button>
                            {showQualityMenu && (
                              <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 py-1 min-w-[8rem] z-50">
                                <button
                                  onClick={() => handleSelectQuality(-1)}
                                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition ${
                                    selectedQuality === -1 ? 'text-brand-400 font-bold' : 'text-white'
                                  }`}
                                >
                                  Auto{hlsQuality && selectedQuality === -1 ? ` (${hlsQuality})` : ''}
                                </button>
                                {qualityLevels
                                  .slice()
                                  .sort((a, b) => b.height - a.height)
                                  .map(level => (
                                    <button
                                      key={level.index}
                                      onClick={() => handleSelectQuality(level.index)}
                                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition ${
                                        selectedQuality === level.index ? 'text-brand-400 font-bold' : 'text-white'
                                      }`}
                                    >
                                      {level.label}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* PiP button */}
                        {document.pictureInPictureEnabled && (
                          <button onClick={togglePiP} className="p-2 hover:text-brand-500 transition" aria-label="Picture in Picture">
                            <PictureInPicture2 size={18} />
                          </button>
                        )}

                        <button onClick={toggleFullScreen} className="p-2 hover:text-brand-500 transition" aria-label="Toggle fullscreen">
                             <Maximize size={18} className="sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {!isPlaying && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="bg-white/10 p-6 rounded-full backdrop-blur-sm border border-white/20 shadow-2xl animate-pulse-slow">
                         <Play size={48} fill="white" className="ml-2 text-white" />
                     </div>
                 </div>
            )}

            {/* Completion Notification */}
            {showCompletionNotification && (
              <div className="absolute top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-fade-in z-30">
                <CheckCircle size={20} fill="currentColor" />
                <span className="font-bold">Module Completed!</span>
              </div>
            )}

            {/* Video Error Overlay */}
            {videoError && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                <div className="bg-neutral-900 border border-red-500 rounded-xl p-8 max-w-md text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Video Error</h3>
                  <p className="text-gray-400 mb-6">{videoError}</p>
                  <button
                    onClick={retryVideo}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-medium transition"
                  >
                    Retry Loading Video
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Course Progress Bar (Global) */}
        <div className="bg-neutral-900 border-b border-neutral-800 p-4">
             <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                 <span className="flex items-center gap-2"><Film size={14}/> {course.title}</span>
                 <span>{Math.round(progressPercent)}% Completed</span>
             </div>
             <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                 <div
                    className="bg-gradient-to-r from-brand-600 to-purple-500 h-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                 />
             </div>
        </div>

        {/* Mobile Module Toggle Bar */}
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="lg:hidden sticky bottom-0 w-full bg-neutral-900 border-t border-neutral-800 p-3 flex items-center justify-between text-white z-20"
        >
          <span className="text-sm font-medium truncate mr-2">
            Module {String(activeChapterIndex + 1).padStart(2, '0')}: {activeModule?.title}
          </span>
          <ChevronUp size={20} className={`transition-transform flex-shrink-0 ${mobileDrawerOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile Module Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl max-h-[60vh] overflow-y-auto animate-slide-up">
          <div className="sticky top-0 bg-neutral-900 p-4 border-b border-neutral-800 flex items-center justify-between z-10">
            <h2 className="font-bold text-white">Course Content</h2>
            <button onClick={() => setMobileDrawerOpen(false)} className="text-neutral-400 p-2">
              <X size={20} />
            </button>
          </div>
          {modules.map((module, idx) => {
            const isCompleted = moduleCompletionMap[module.id] || false;
            return (
              <button
                key={module.id}
                onClick={() => { setActiveChapterId(module.id); setMobileDrawerOpen(false); }}
                className={`w-full text-left p-4 border-b border-neutral-800 hover:bg-white/5 transition flex items-start gap-3 group ${
                  activeChapterId === module.id ? 'bg-brand-900/20 border-l-4 border-l-brand-600' : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="mt-0.5">
                  {isCompleted ? <CheckCircle size={16} fill="currentColor" className="text-brand-500" /> : <Circle size={16} className="text-neutral-600 group-hover:text-neutral-500" />}
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1 block">Module {String(idx + 1).padStart(2, '0')}</span>
                  <h3 className={`text-sm font-medium leading-tight ${activeChapterId === module.id ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                    {module.title}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1.5 font-mono">{module.duration}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile drawer backdrop */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-20" onClick={() => setMobileDrawerOpen(false)} />
      )}

      {/* Desktop Curriculum Sidebar */}
      <div className="hidden lg:flex w-96 bg-neutral-900 border-l border-neutral-800 flex-col h-full z-10">
         <div className="p-4 border-b border-neutral-800 bg-neutral-900">
            <h2 className="font-bold text-lg text-white">Course Content</h2>
            <p className="text-xs text-gray-500 mt-1">{modules.length} Modules</p>
         </div>

         <div className="flex-grow overflow-y-auto custom-scrollbar">
            {modules.map((module, idx) => {
                const isCompleted = moduleCompletionMap[module.id] || false;

                return (
                <button
                    key={module.id}
                    onClick={() => setActiveChapterId(module.id)}
                    className={`w-full text-left p-4 border-b border-neutral-800 hover:bg-white/5 transition flex items-start gap-3 group ${
                        activeChapterId === module.id ? 'bg-brand-900/20 border-l-4 border-l-brand-600' : 'border-l-4 border-l-transparent'
                    }`}
                >
                    <div className="mt-0.5">
                        {isCompleted ? <CheckCircle size={16} fill="currentColor" className="text-brand-500" /> : <Circle size={16} className="text-neutral-600 group-hover:text-neutral-500" />}
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1 block">Module {String(idx + 1).padStart(2, '0')}</span>
                        <h3 className={`text-sm font-medium leading-tight ${activeChapterId === module.id ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                            {module.title}
                        </h3>
                        <p className="text-xs text-neutral-600 mt-1.5 font-mono">{module.duration}</p>
                    </div>
                </button>
                );
            })}
         </div>

         {/* Desktop Notes Area */}
         <div className="flex flex-col p-4 border-t border-neutral-800 bg-neutral-900 h-1/3">
            <h3 className="font-bold text-sm mb-2 text-neutral-400 flex items-center gap-2"><Edit3 size={14}/> Personal Notes</h3>
            <textarea
                className="flex-grow w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-gray-300 resize-none focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                placeholder="Take notes for this module..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            ></textarea>
         </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
