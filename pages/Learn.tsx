import { CheckCircle, Circle, Play, Pause, Maximize, Volume2, VolumeX, SkipBack, SkipForward, Edit3, Film, Loader2, Layers, ArrowRight, ChevronDown, PictureInPicture2 } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { Thumbnail } from '../components/Thumbnail';
import { useToast } from '../components/Toast';
import { VideoPlayer, VideoPlayerHandle } from '../components/VideoPlayer';
import { useAuth } from '../context/AuthContext';
import { useAccessControl } from '../hooks/useAccessControl';
import { useMobileGestures } from '../hooks/useMobileGestures';
import { useModuleNotes } from '../hooks/useModuleNotes';
import { useModuleProgress } from '../hooks/useModuleProgress';
import { useOrientation } from '../hooks/useOrientation';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { coursesApi } from '../services/api';
import { CourseType } from '../types';
import { logger } from '../utils/logger';

import type { Course, Module, Lesson } from '../types';

/**
 * Extract Bunny Stream video GUID from a video URL
 * Bunny URLs follow: https://{cdn}/{guid}/playlist.m3u8
 */
function extractVideoId(videoUrl?: string): string | undefined {
  if (!videoUrl) {return undefined;}
  const match = videoUrl.match(/\/([a-f0-9-]{36})\/playlist\.m3u8/i);
  return match?.[1];
}

export const Learn: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();

  // Fetch course and chapters (modules) + their lessons from API
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);

  // Use access control hook
  const { hasAccess, isLoading: isCheckingAccess } = useAccessControl(id);
  const [activeLessonId, setActiveLessonId] = useState<string | undefined>(undefined);
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(new Set());

  const videoRef = useRef<VideoPlayerHandle>(null);

  // Flatten lessons across chapters for linear prev/next traversal
  const flatLessons = useMemo<Lesson[]>(
    () => modules.flatMap(m => m.lessons ?? []),
    [modules]
  );
  const activeLessonIndex = Math.max(0, flatLessons.findIndex(l => l.id === activeLessonId));
  const activeLesson = flatLessons[activeLessonIndex];
  const activeModule = useMemo(
    () => modules.find(m => (m.lessons ?? []).some(l => l.id === activeLessonId)),
    [modules, activeLessonId]
  );
  const activeModuleIndex = activeModule ? modules.findIndex(m => m.id === activeModule.id) : 0;

  // A chapter is "complete" when it has lessons and all of them are complete.
  const isModuleComplete = useCallback(
    (m: Module, map: Record<string, boolean>) =>
      (m.lessons?.length ?? 0) > 0 && (m.lessons ?? []).every(l => map[l.id]),
    []
  );

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModuleIds(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {next.delete(moduleId);} else {next.add(moduleId);}
      return next;
    });
  }, []);

  // --- Hook wiring ---

  const {
    isPlaying, setIsPlaying,
    currentTime,
    duration, setDuration,
    volume, setVolume,
    isMuted, setIsMuted,
    showControls,
    videoError,
    playbackRate,
    hlsQuality,
    qualityLevels,
    selectedQuality,
    showQualityMenu, setShowQualityMenu,
    bufferedEnd,
    seekPreviewTime, setSeekPreviewTime,
    seekPreviewX,
    handlePlayPause,
    handleTimeUpdateBasic,
    handleSeek,
    toggleMute,
    toggleFullScreen,
    cycleSpeed,
    adjustSpeed,
    handleMouseMove,
    handleTouchInteraction,
    togglePiP,
    handleVideoError,
    retryVideo,
    handleQualityChange,
    handleLevelsLoaded,
    handleSelectQuality,
    handleSeekHover,
  } = useVideoPlayer({ videoRef, activeLessonId, showToast });

  // Orientation detection — maximize video in landscape on mobile
  const { isLandscape, lockToLandscape, unlock: unlockOrientation } = useOrientation();
  const [isMobileWidth, setIsMobileWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const isMobileLandscape = isLandscape && isMobileWidth;

  // Track screen width for landscape detection
  useEffect(() => {
    const handleResize = () => setIsMobileWidth(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wrap fullscreen toggle to lock orientation in landscape
  const handleFullScreenWithOrientation = useCallback(async () => {
    await toggleFullScreen();
    // After entering fullscreen, lock to landscape for better video experience
    if (document.fullscreenElement) {
      lockToLandscape();
    } else {
      unlockOrientation();
    }
  }, [toggleFullScreen, lockToLandscape, unlockOrientation]);

  const {
    progressPercent,
    lessonCompletionMap,
    showCompletionNotification,
    pendingResumeRef,
    checkCompletion,
  } = useModuleProgress({
    courseId: id,
    activeLessonId,
    isPlaying,
    user,
    videoRef,
    hasAccess,
  });

  const { doubleTapIndicator, handleVideoTap, handleKeyDown } = useMobileGestures({
    videoRef,
    handlePlayPause,
    toggleMute,
    toggleFullScreen,
    adjustSpeed,
    setShowQualityMenu,
    setVolume,
    setIsMuted,
    duration,
  });

  const { notes, setNotes } = useModuleNotes({
    courseId: id,
    activeLessonId,
    userId: user?.id,
  });

  // Load course and chapters/lessons from API (parallelized)
  useEffect(() => {
    const loadCourse = async () => {
      if (!id) {return;}

      try {
        setIsLoadingCourse(true);

        const [courseResponse, modulesResponse] = await Promise.all([
          coursesApi.getCourse(id),
          coursesApi.getCourseModules(id),
        ]);

        setCourse(courseResponse.course);
        const loadedModules = modulesResponse.modules || [];
        setModules(loadedModules);

        // Default active lesson = first lesson of the first chapter that has lessons.
        const firstLesson = loadedModules.flatMap(m => m.lessons ?? [])[0];
        if (firstLesson) {
          setActiveLessonId(firstLesson.id);
          const owner = loadedModules.find(m => (m.lessons ?? []).some(l => l.id === firstLesson.id));
          if (owner) {setExpandedModuleIds(new Set([owner.id]));}
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

  // Keep the chapter containing the active lesson expanded
  useEffect(() => {
    if (activeModule) {
      setExpandedModuleIds(prev => (prev.has(activeModule.id) ? prev : new Set(prev).add(activeModule.id)));
    }
  }, [activeModule]);

  // Combined onTimeUpdate: basic state + completion check
  const handleTimeUpdate = () => {
    handleTimeUpdateBasic();
    if (videoRef.current) {
      checkCompletion(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  // Keyboard shortcuts are handled by useMobileGestures via onKeyDown on the video container.

  // Previous / Next Lesson Logic (traverses lessons across chapter boundaries)
  const selectLesson = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
    setIsPlaying(false);
  }, [setIsPlaying]);

  const handlePrev = () => {
    if (activeLessonIndex > 0) {
      selectLesson(flatLessons[activeLessonIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (activeLessonIndex < flatLessons.length - 1) {
      selectLesson(flatLessons[activeLessonIndex + 1].id);
    }
  };

  // Loading course data
  if (isLoadingCourse || isCheckingAccess) {
    return (
      <div className="flex items-center justify-center h-screen t-bg">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-brand-600 mx-auto mb-4" />
          <p className="t-text-2">
            {isLoadingCourse ? 'Loading course...' : 'Verifying access...'}
          </p>
        </div>
      </div>
    );
  }

  // Course not found
  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen t-bg">
        <div className="text-center">
          <h2 className="text-2xl font-bold t-text mb-4">Course not found</h2>
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-medium">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // Non-enrolled users are redirected to the course details page,
  // where the sticky CTA + trust badges are the canonical enroll surface.
  if (!hasAccess) {
    return <Navigate to={`/course/${course.id}`} replace />;
  }

  // Bundle Hub View — bundles don't have chapters, show linked courses instead
  if (course.type === CourseType.BUNDLE) {
    const bundledCourses = course.bundledCourses || [];
    return (
      <div className="min-h-[calc(100vh-64px)] t-bg">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-brand-600/20 text-brand-400 text-xs font-bold px-3 py-1 rounded-full border border-brand-500/30">
                <Layers size={12} className="inline mr-1" /> BUNDLE
              </span>
            </div>
            <h1 className="text-3xl font-bold t-text mb-2">{course.title}</h1>
            <p className="t-text-2">{course.description}</p>
          </div>

          {/* Bundle course count */}
          <div className="t-card border t-border rounded-xl p-6 mb-8">
            <div className="flex justify-between text-sm t-text-2">
              <span>{bundledCourses.length} Course{bundledCourses.length !== 1 ? 's' : ''} in this Bundle</span>
            </div>
          </div>

          {/* Bundled course cards */}
          <div className="space-y-4">
            {bundledCourses.map((bc, index) => (
              <Link
                key={bc.id}
                to={`/learn/${bc.id}`}
                className="flex gap-4 p-4 t-card border t-border rounded-xl hover:border-brand-500/40 hover:bg-[var(--surface-hover)] transition group"
              >
                <div className="w-24 h-16 md:w-32 md:h-20 rounded-lg overflow-hidden flex-shrink-0 t-bg-alt">
                  <Thumbnail src={bc.thumbnail} alt={bc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider t-text-3 font-bold">Course {index + 1}</span>
                  <h3 className="font-bold t-text group-hover:text-brand-400 transition truncate">{bc.title}</h3>
                  <p className="text-sm t-text-2 line-clamp-1 mt-1">{bc.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs t-text-2">
                    <span>{bc.lessonCount} Lessons</span>
                  </div>
                </div>
                <div className="hidden md:flex items-center t-text-3 group-hover:text-brand-500 transition">
                  <ArrowRight size={20} />
                </div>
              </Link>
            ))}
          </div>

          {bundledCourses.length === 0 && (
            <div className="text-center py-16">
              <p className="t-text-2 mb-4">No courses have been added to this bundle yet.</p>
              <Link to="/" className="text-brand-500 hover:text-brand-400 font-medium">Back to Catalog</Link>
            </div>
          )}
        </div>
        <ToastContainer />
      </div>
    );
  }

  // No lessons available (for MODULE courses only)
  if (flatLessons.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen t-bg">
        <div className="text-center">
          <h2 className="text-2xl font-bold t-text mb-4">No lessons available</h2>
          <p className="t-text-2 mb-4">This course doesn't have any lessons yet.</p>
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-medium">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // Shared curriculum outline (chapters → lessons) used by both the mobile inline
  // panel and the desktop sidebar — single source of truth so they can't drift.
  const renderOutline = () => (
    <>
      {modules.map((module, mIdx) => {
        const moduleLessons = module.lessons ?? [];
        const moduleComplete = isModuleComplete(module, lessonCompletionMap);
        const expanded = expandedModuleIds.has(module.id);
        const doneCount = moduleLessons.filter(l => lessonCompletionMap[l.id]).length;
        return (
          <div key={module.id} className="border-b t-border">
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full text-left p-4 flex items-center gap-3 hover:bg-[var(--surface-hover)] transition"
            >
              <div className="mt-0.5">
                {moduleComplete
                  ? <CheckCircle size={16} fill="currentColor" className="text-brand-500" />
                  : <Circle size={16} className="t-text-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider t-text-3 font-bold mb-1 block">Chapter {String(mIdx + 1).padStart(2, '0')}</span>
                <h3 className="text-sm font-semibold leading-tight t-text">{module.title}</h3>
                <p className="text-xs t-text-3 mt-1">{doneCount}/{moduleLessons.length} lesson{moduleLessons.length !== 1 ? 's' : ''}</p>
              </div>
              <ChevronDown size={18} className={`flex-shrink-0 t-text-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && moduleLessons.map((lesson, lIdx) => {
              const isCompleted = lessonCompletionMap[lesson.id] || false;
              const isActive = activeLessonId === lesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => selectLesson(lesson.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`w-full text-left pl-10 pr-4 py-3 border-t t-border transition flex items-start gap-3 group ${
                    isActive ? 't-card border-l-4 border-l-brand-600' : 'border-l-4 border-l-transparent hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isCompleted
                      ? <CheckCircle size={15} fill="currentColor" className="text-brand-500" />
                      : isActive
                        ? <Play size={15} fill="currentColor" className="text-brand-600" />
                        : <Circle size={15} className="t-text-3 group-hover:t-text-2" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium leading-tight ${isActive ? 'text-brand-600' : 't-text-2 group-hover:t-text'}`}>{lesson.title}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] t-text-3 font-mono">{String(mIdx + 1).padStart(2, '0')}.{String(lIdx + 1).padStart(2, '0')}</span>
                      <span className="text-xs t-text-3 font-mono">{lesson.duration}</span>
                      {lesson.isFreePreview && (
                        <span className="text-[9px] uppercase font-bold tracking-wider text-brand-400">Free</span>
                      )}
                      {isActive && (
                        <span className="text-[9px] uppercase font-bold tracking-wider text-brand-500">Now playing</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );

  const renderNotes = (id: string) => (
    <>
      <label htmlFor={id} className="font-bold text-sm mb-2 t-text-2 flex items-center gap-2"><Edit3 size={14}/> Personal Notes</label>
      <textarea
        id={id}
        className="flex-grow w-full t-bg t-border border rounded-lg p-3 text-xs t-text-2 resize-none focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
        placeholder="Take notes for this lesson..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-80px)] overflow-hidden bg-black">

      {/* Main Video Player Area */}
      <div className="flex-grow flex flex-col h-full overflow-y-auto relative t-bg">
        <div
            className="relative w-full aspect-video bg-black group flex-shrink-0 outline-none select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowQualityMenu(false)}
            onTouchStart={handleTouchInteraction}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
            tabIndex={0}
        >
            <ErrorBoundary fallback={
              <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white gap-4">
                <Film size={40} className="text-red-400" />
                <p className="text-sm text-white/50">Video failed to load</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition"
                >
                  Reload video
                </button>
              </div>
            }>
            <VideoPlayer
                ref={videoRef}
                videoId={extractVideoId(activeLesson?.videoUrl)}
                moduleId={activeLesson?.id}
                fallbackUrl={activeLesson?.videoUrl || ''}
                className="w-full h-full"
                controls={false}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onError={handleVideoError}
                onQualityChange={handleQualityChange}
                onLevelsLoaded={handleLevelsLoaded}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                    if (pendingResumeRef.current > 0) {
                      videoRef.current.currentTime = pendingResumeRef.current;
                      logger.debug(`[Progress] Resumed at ${pendingResumeRef.current}s (onLoadedMetadata)`);
                      pendingResumeRef.current = 0;
                    }
                  }
                }}
            />
            </ErrorBoundary>

            {/* Tap overlay for play/pause + double-tap skip */}
            <div
              className="absolute inset-0 z-10"
              onClick={handleVideoTap}
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
                    <div className="h-1 sm:h-1 active:h-2 w-full t-card rounded-lg overflow-hidden transition-all">
                        {/* Buffered bar */}
                        <div className="absolute h-1 bg-[var(--surface-hover)] rounded-lg" style={{ width: `${(bufferedEnd / (duration || 1)) * 100}%` }}></div>
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
                        <button onClick={handlePrev} className="hidden sm:block p-2 hover:text-brand-500 transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 rounded outline-none" disabled={activeLessonIndex === 0} aria-label="Previous lesson">
                            <SkipBack size={20} fill="currentColor" />
                        </button>

                        <button onClick={handlePlayPause} className="p-2 hover:text-brand-500 transition focus-visible:ring-2 focus-visible:ring-brand-500 rounded outline-none" aria-label={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" fill="currentColor" /> : <Play size={20} className="sm:w-6 sm:h-6" fill="currentColor" />}
                        </button>

                        {/* Skip next — hidden on mobile */}
                        <button onClick={handleNext} className="hidden sm:block p-2 hover:text-brand-500 transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 rounded outline-none" disabled={activeLessonIndex === flatLessons.length - 1} aria-label="Next lesson">
                            <SkipForward size={20} fill="currentColor" />
                        </button>

                        {/* Volume — hidden on mobile (users use hardware volume) */}
                        <div className="hidden sm:flex items-center gap-2 group/vol pl-4 border-l border-white/20 ml-4">
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
                                        if(videoRef.current) {videoRef.current.volume = v;}
                                        setIsMuted(v === 0);
                                    }}
                                    className="w-20 h-1 accent-white"
                                    aria-label="Volume"
                                />
                            </div>
                        </div>

                        {/* Time — compact on mobile */}
                        <span className="text-[10px] sm:text-xs font-mono text-white/60">
                            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} /
                            {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Speed Control */}
                        <button
                          onClick={cycleSpeed}
                          className="text-[10px] sm:text-xs font-bold px-2 py-2 sm:py-1 rounded hover:bg-white/20 transition min-w-[2.5rem] sm:min-w-[3rem]"
                          title="Playback speed (< / > keys)"
                        >
                          {playbackRate}x
                        </button>

                        {/* Quality Selector */}
                        {qualityLevels.length > 0 && (
                          <div className="relative">
                            <button
                              onClick={() => setShowQualityMenu(prev => !prev)}
                              className="text-[10px] sm:text-xs font-bold px-2 py-2 sm:py-1 rounded hover:bg-white/20 transition min-w-[3rem]"
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
                                  className={`w-full text-left px-3 py-2.5 sm:py-1.5 text-xs hover:bg-white/10 transition ${
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
                                      className={`w-full text-left px-3 py-2.5 sm:py-1.5 text-xs hover:bg-white/10 transition ${
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

                        <button onClick={handleFullScreenWithOrientation} className="p-2 hover:text-brand-500 transition focus-visible:ring-2 focus-visible:ring-brand-500 rounded outline-none" aria-label="Toggle fullscreen">
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
              <div className="absolute top-4 right-4 t-status-success border px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-fade-in z-30">
                <CheckCircle size={20} fill="currentColor" />
                <span className="font-bold">Lesson Completed!</span>
              </div>
            )}

            {/* Video Error Overlay */}
            {videoError && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                <div className="t-bg border-[var(--status-danger-border)] border rounded-xl p-8 max-w-md text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--status-danger-bg)' }}>
                    <svg className="w-8 h-8" style={{ color: 'var(--status-danger-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold t-text mb-2">Video Error</h3>
                  <p className="t-text-2 mb-6">{videoError}</p>
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

        {/* Course Progress Bar (Global) — hidden in mobile landscape to maximize video */}
        <div className={`t-bg border-b t-border p-4 ${isMobileLandscape ? 'hidden' : ''}`}>
             <div className="flex items-center justify-between gap-3 mb-2">
                 <div className="min-w-0">
                     <p className="text-[10px] uppercase tracking-wider t-text-3 font-bold flex items-center gap-1.5"><Film size={12}/> {course.title}</p>
                     <h2 className="text-sm font-bold t-text truncate mt-0.5">
                         {activeModule ? `Ch ${String(activeModuleIndex + 1).padStart(2, '0')} · ` : ''}{activeLesson?.title}
                     </h2>
                 </div>
                 <span className="text-xs font-semibold t-text-2 flex-shrink-0 tabular-nums">
                     {flatLessons.filter(l => lessonCompletionMap[l.id]).length}/{flatLessons.length} · {Math.round(progressPercent)}%
                 </span>
             </div>
             <div className="w-full t-bg-alt h-1.5 rounded-full overflow-hidden">
                 <div
                    className="bg-gradient-to-r from-brand-600 to-brand-400 h-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                 />
             </div>
        </div>

        {/* Mobile prev/next lesson buttons — hidden in mobile landscape to maximize video */}
        <div className={`lg:hidden flex items-center gap-2 px-3 pt-2 pb-1 t-bg ${isMobileLandscape ? 'hidden' : ''}`}>
          <button
            onClick={handlePrev}
            disabled={activeLessonIndex === 0}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-bold t-card t-border border py-2 px-3 rounded-full disabled:opacity-40 transition hover:bg-[var(--surface-hover)]"
          >
            <SkipBack size={14} /> Prev
          </button>
          <button
            onClick={handleNext}
            disabled={activeLessonIndex === flatLessons.length - 1}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-bold t-card t-border border py-2 px-3 rounded-full disabled:opacity-40 transition hover:bg-[var(--surface-hover)]"
          >
            Next <SkipForward size={14} />
          </button>
        </div>

        {/* Mobile: inline curriculum + notes — fills the space below the player */}
        <div className={`lg:hidden flex flex-col ${isMobileLandscape ? 'hidden' : ''}`}>
          <div className="px-4 py-3 border-y t-border flex items-center justify-between sticky top-0 t-bg z-[5]">
            <h2 className="font-bold t-text text-sm">Course Content</h2>
            <span className="text-xs t-text-3">{modules.length} Ch · {flatLessons.length} Lessons</span>
          </div>
          {renderOutline()}
          <div className="flex flex-col p-4 border-t t-border">
            {renderNotes('lesson-notes-mobile')}
          </div>
        </div>
      </div>

      {/* Desktop Curriculum Sidebar */}
      <div className="hidden lg:flex w-96 t-bg border-l t-border flex-col h-full z-10">
         <div className="p-4 border-b t-border t-bg">
            <h2 className="font-bold text-lg t-text">Course Content</h2>
            <p className="text-xs t-text-3 mt-1">{modules.length} Chapters · {flatLessons.length} Lessons</p>
         </div>

         <div className="flex-grow overflow-y-auto custom-scrollbar">
            {renderOutline()}
         </div>

         {/* Desktop Notes Area */}
         <div className="flex flex-col p-4 border-t t-border t-bg h-1/3">
            {renderNotes('lesson-notes-desktop')}
         </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
