import { CheckCircle, Circle, Play, Pause, Maximize, Volume2, VolumeX, SkipBack, SkipForward, Edit3, Film, Loader2, BookOpen, Layers, ArrowRight, ChevronUp, X, PictureInPicture2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { EnrollmentGate } from '../components/EnrollmentGate';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useToast } from '../components/Toast';
import { VideoPlayer, VideoPlayerHandle } from '../components/VideoPlayer';
import { useAuth } from '../context/AuthContext';
import { useAccessControl } from '../hooks/useAccessControl';
import { useMobileGestures } from '../hooks/useMobileGestures';
import { useModuleNotes } from '../hooks/useModuleNotes';
import { useModuleProgress } from '../hooks/useModuleProgress';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { coursesApi } from '../services/api';
import { CourseType } from '../types';
import { logger } from '../utils/logger';

import type { Course, Module } from '../types';

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

  // Mobile responsiveness
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const videoRef = useRef<VideoPlayerHandle>(null);

  const activeChapterIndex = Math.max(0, modules.findIndex(m => m.id === activeChapterId));

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
  } = useVideoPlayer({ videoRef, activeChapterId, showToast });

  const {
    progressPercent,
    moduleCompletionMap,
    showCompletionNotification,
    pendingResumeRef,
    checkCompletion,
  } = useModuleProgress({
    courseId: id,
    activeChapterId,
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
    activeChapterId,
    userId: user?.id,
  });

  // Load course and modules from API (parallelized)
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

  // Combined onTimeUpdate: basic state + completion check
  const handleTimeUpdate = () => {
    handleTimeUpdateBasic();
    if (videoRef.current) {
      checkCompletion(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  // Keyboard shortcuts are handled by useMobileGestures via onKeyDown on the video container.

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
                  {bc.thumbnail ? (
                    <img src={bc.thumbnail} alt={bc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center t-text-3">
                      <BookOpen size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider t-text-3 font-bold">Course {index + 1}</span>
                  <h3 className="font-bold t-text group-hover:text-brand-400 transition truncate">{bc.title}</h3>
                  <p className="text-sm t-text-2 line-clamp-1 mt-1">{bc.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs t-text-2">
                    <span>{bc.moduleCount} Lessons</span>
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

  // No modules available (for MODULE courses only)
  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen t-bg">
        <div className="text-center">
          <h2 className="text-2xl font-bold t-text mb-4">No modules available</h2>
          <p className="t-text-2 mb-4">This course doesn't have any modules yet.</p>
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
            onMouseLeave={() => setShowQualityMenu(false)}
            onTouchStart={handleTouchInteraction}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
            tabIndex={0}
        >
            <ErrorBoundary fallback={
              <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white gap-4">
                <Film size={40} className="text-red-400" />
                <p className="text-sm text-gray-400">Video failed to load</p>
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
                        <button onClick={handlePrev} className="hidden sm:block p-2 hover:text-brand-500 transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 rounded outline-none" disabled={activeChapterIndex === 0} aria-label="Previous module">
                            <SkipBack size={20} fill="currentColor" />
                        </button>

                        <button onClick={handlePlayPause} className="p-2 hover:text-brand-500 transition focus-visible:ring-2 focus-visible:ring-brand-500 rounded outline-none" aria-label={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" fill="currentColor" /> : <Play size={20} className="sm:w-6 sm:h-6" fill="currentColor" />}
                        </button>

                        {/* Skip next — hidden on mobile */}
                        <button onClick={handleNext} className="hidden sm:block p-2 hover:text-brand-500 transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 rounded outline-none" disabled={activeChapterIndex === modules.length - 1} aria-label="Next module">
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
                                        if(videoRef.current) {videoRef.current.volume = v;}
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

                        <button onClick={toggleFullScreen} className="p-2 hover:text-brand-500 transition focus-visible:ring-2 focus-visible:ring-brand-500 rounded outline-none" aria-label="Toggle fullscreen">
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
                <span className="font-bold">Module Completed!</span>
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

        {/* Course Progress Bar (Global) */}
        <div className="t-bg border-b t-border p-4">
             <div className="flex justify-between text-xs t-text-2 mb-2 font-medium">
                 <span className="flex items-center gap-2"><Film size={14}/> {course.title}</span>
                 <span>{Math.round(progressPercent)}% Completed</span>
             </div>
             <div className="w-full t-bg-alt h-1.5 rounded-full overflow-hidden">
                 <div
                    className="bg-gradient-to-r from-brand-600 to-brand-400 h-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                 />
             </div>
        </div>

        {/* Mobile prev/next module buttons */}
        <div className="lg:hidden flex items-center gap-2 px-3 pt-2 pb-1 t-bg">
          <button
            onClick={handlePrev}
            disabled={activeChapterIndex === 0}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-bold t-card t-border border py-2 px-3 rounded-full disabled:opacity-40 transition hover:bg-[var(--surface-hover)]"
          >
            <SkipBack size={14} /> Prev
          </button>
          <button
            onClick={handleNext}
            disabled={activeChapterIndex === modules.length - 1}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-bold t-card t-border border py-2 px-3 rounded-full disabled:opacity-40 transition hover:bg-[var(--surface-hover)]"
          >
            Next <SkipForward size={14} />
          </button>
        </div>

        {/* Mobile Module Toggle Bar */}
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="lg:hidden sticky bottom-0 w-full t-bg border-t t-border p-3 flex items-center justify-between t-text z-20"
        >
          <span className="text-sm font-medium truncate mr-2">
            Module {String(activeChapterIndex + 1).padStart(2, '0')}: {activeModule?.title}
          </span>
          <ChevronUp size={20} className={`transition-transform flex-shrink-0 ${mobileDrawerOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile Module Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 t-bg border-t t-border rounded-t-2xl max-h-[60vh] overflow-y-auto animate-slide-up">
          <div className="sticky top-0 t-bg p-4 border-b t-border flex items-center justify-between z-10">
            <h2 className="font-bold t-text">Course Content</h2>
            <button onClick={() => setMobileDrawerOpen(false)} className="t-text-2 p-2">
              <X size={20} />
            </button>
          </div>
          {modules.map((module, idx) => {
            const isCompleted = moduleCompletionMap[module.id] || false;
            return (
              <button
                key={module.id}
                onClick={() => { setActiveChapterId(module.id); setMobileDrawerOpen(false); }}
                className={`w-full text-left p-4 border-b t-border hover:bg-[var(--surface-hover)] transition flex items-start gap-3 group ${
                  activeChapterId === module.id ? 'bg-brand-900/20 border-l-4 border-l-brand-600' : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="mt-0.5">
                  {isCompleted ? <CheckCircle size={16} fill="currentColor" className="text-brand-500" /> : <Circle size={16} className="t-text-3 group-hover:t-text-2" />}
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider t-text-3 font-bold mb-1 block">Module {String(idx + 1).padStart(2, '0')}</span>
                  <h3 className={`text-sm font-medium leading-tight ${activeChapterId === module.id ? 't-text' : 't-text-2 group-hover:t-text'}`}>
                    {module.title}
                  </h3>
                  <p className="text-xs t-text-3 mt-1.5 font-mono">{module.duration}</p>
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
      <div className="hidden lg:flex w-96 t-bg border-l t-border flex-col h-full z-10">
         <div className="p-4 border-b t-border t-bg">
            <h2 className="font-bold text-lg t-text">Course Content</h2>
            <p className="text-xs t-text-3 mt-1">{modules.length} Modules</p>
         </div>

         <div className="flex-grow overflow-y-auto custom-scrollbar">
            {modules.map((module, idx) => {
                const isCompleted = moduleCompletionMap[module.id] || false;

                return (
                <button
                    key={module.id}
                    onClick={() => setActiveChapterId(module.id)}
                    className={`w-full text-left p-4 border-b t-border hover:bg-[var(--surface-hover)] transition flex items-start gap-3 group ${
                        activeChapterId === module.id ? 'bg-brand-900/20 border-l-4 border-l-brand-600' : 'border-l-4 border-l-transparent'
                    }`}
                >
                    <div className="mt-0.5">
                        {isCompleted ? <CheckCircle size={16} fill="currentColor" className="text-brand-500" /> : <Circle size={16} className="t-text-3 group-hover:t-text-2" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase tracking-wider t-text-3 font-bold mb-1 block">Module {String(idx + 1).padStart(2, '0')}</span>
                        <h3 className={`text-sm font-medium leading-tight ${activeChapterId === module.id ? 't-text' : 't-text-2 group-hover:t-text'}`}>
                            {module.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-xs t-text-3 font-mono">{module.duration}</p>
                          {isCompleted && activeChapterId === module.id && (
                            <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: 'var(--status-success-text)' }}>
                              <CheckCircle size={10} fill="currentColor" /> Completed
                            </span>
                          )}
                        </div>
                    </div>
                </button>
                );
            })}
         </div>

         {/* Desktop Notes Area */}
         <div className="flex flex-col p-4 border-t t-border t-bg h-1/3">
            <h3 className="font-bold text-sm mb-2 t-text-2 flex items-center gap-2"><Edit3 size={14}/> Personal Notes</h3>
            <textarea
                className="flex-grow w-full t-bg t-border border rounded-lg p-3 text-xs t-text-2 resize-none focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
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
