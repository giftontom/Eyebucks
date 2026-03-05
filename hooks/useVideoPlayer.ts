import { useState, useEffect, useRef, useCallback } from 'react';

import type { VideoPlayerHandle, QualityLevel } from '../components/VideoPlayer';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface UseVideoPlayerInput {
  videoRef: React.RefObject<VideoPlayerHandle | null>;
  activeChapterId?: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info', duration?: number) => void;
}

interface UseVideoPlayerReturn {
  // State
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  duration: number;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  showControls: boolean;
  videoError: string | null;
  playbackRate: number;
  hlsQuality: string | null;
  qualityLevels: QualityLevel[];
  selectedQuality: number;
  showQualityMenu: boolean;
  setShowQualityMenu: React.Dispatch<React.SetStateAction<boolean>>;
  bufferedEnd: number;
  seekPreviewTime: number | null;
  setSeekPreviewTime: React.Dispatch<React.SetStateAction<number | null>>;
  seekPreviewX: number;
  // Handlers
  handlePlayPause: () => void;
  handleTimeUpdateBasic: () => void;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleMute: () => void;
  toggleFullScreen: () => void;
  cycleSpeed: () => void;
  adjustSpeed: (direction: 'up' | 'down') => void;
  handleMouseMove: () => void;
  handleTouchInteraction: () => void;
  togglePiP: () => Promise<void>;
  handleVideoError: (error: string) => void;
  retryVideo: () => Promise<void>;
  handleQualityChange: (quality: string) => void;
  handleLevelsLoaded: (levels: QualityLevel[]) => void;
  handleSelectQuality: (index: number) => void;
  handleSeekHover: (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => void;
}

export function useVideoPlayer({ videoRef, activeChapterId, showToast }: UseVideoPlayerInput): UseVideoPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hlsQuality, setHlsQuality] = useState<string | null>(null);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | null>(null);
  const [seekPreviewX, setSeekPreviewX] = useState(0);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset quality state when switching modules
  useEffect(() => {
    setQualityLevels([]);
    setSelectedQuality(-1);
    setHlsQuality(null);
    setShowQualityMenu(false);
  }, [activeChapterId]);

  // Sync playback rate when switching modules
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [activeChapterId, playbackRate, videoRef]);

  // Clean up controls timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {clearTimeout(controlsTimeoutRef.current);}
    };
  }, []);

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [videoRef]);

  const handleTimeUpdateBasic = useCallback(() => {
    if (!videoRef.current) {return;}
    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration);
    setBufferedEnd(videoRef.current.buffered);
  }, [videoRef]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [videoRef, isMuted]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, [videoRef]);

  const cycleSpeed = useCallback(() => {
    setPlaybackRate(prev => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
      if (videoRef.current) {videoRef.current.playbackRate = next;}
      return next;
    });
  }, [videoRef]);

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
      if (videoRef.current) {videoRef.current.playbackRate = next;}
      return next;
    });
  }, [videoRef]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {clearTimeout(controlsTimeoutRef.current);}
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const handleTouchInteraction = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {clearTimeout(controlsTimeoutRef.current);}
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const togglePiP = useCallback(async () => {
    if (videoRef.current) {
      await videoRef.current.requestPiP();
    }
  }, [videoRef]);

  const handleVideoError = useCallback((error: string) => {
    setVideoError(error);
    showToast(error, 'error', 5000);
    setIsPlaying(false);
  }, [showToast]);

  const retryVideo = useCallback(async () => {
    setVideoError(null);
    if (videoRef.current) {
      await videoRef.current.refreshUrl();
      videoRef.current.load();
    }
  }, [videoRef]);

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
  }, [videoRef]);

  const handleSeekHover = useCallback((e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = (clientX - rect.left) / rect.width;
    const time = percent * (duration || 0);
    setSeekPreviewTime(time);
    setSeekPreviewX(clientX - rect.left);
  }, [duration]);

  return {
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
  };
}
