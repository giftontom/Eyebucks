import { useState, useRef, useCallback } from 'react';

import type { VideoPlayerHandle } from '../components/VideoPlayer';

interface UseMobileGesturesInput {
  videoRef: React.RefObject<VideoPlayerHandle | null>;
  handlePlayPause: () => void;
  toggleMute: () => void;
  toggleFullScreen: () => void;
  adjustSpeed: (direction: 'up' | 'down') => void;
  setShowQualityMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  duration: number;
}

interface UseMobileGesturesReturn {
  doubleTapIndicator: { side: 'left' | 'right'; key: number } | null;
  handleVideoTap: (e: React.MouseEvent | React.TouchEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useMobileGestures({
  videoRef,
  handlePlayPause,
  toggleMute,
  toggleFullScreen,
  adjustSpeed,
  setShowQualityMenu,
  setVolume,
  setIsMuted,
  duration,
}: UseMobileGesturesInput): UseMobileGesturesReturn {
  const [doubleTapIndicator, setDoubleTapIndicator] = useState<{ side: 'left' | 'right'; key: number } | null>(null);
  const doubleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  const handleVideoTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setShowQualityMenu(false);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const tapX = clientX - rect.left;
    const isLeftHalf = tapX < rect.width / 2;
    const now = Date.now();

    if (lastTapRef.current && now - lastTapRef.current.time < 300) {
      // Double-tap detected
      if (doubleTapTimeoutRef.current) {clearTimeout(doubleTapTimeoutRef.current);}
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
      handlePlayPause();
      lastTapRef.current = null;
    }, 300);
  }, [videoRef, handlePlayPause, setShowQualityMenu]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!videoRef.current) {return;}
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        handlePlayPause();
        break;
      case 'ArrowLeft':
      case 'j':
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        break;
      case 'ArrowRight':
      case 'l':
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
  }, [videoRef, handlePlayPause, toggleMute, toggleFullScreen, adjustSpeed, setShowQualityMenu, setVolume, setIsMuted]);

  return {
    doubleTapIndicator,
    handleVideoTap,
    handleKeyDown,
  };
}
