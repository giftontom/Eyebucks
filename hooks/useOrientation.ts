import { useState, useEffect, useCallback } from 'react';

interface OrientationState {
  /** Whether the device is currently in landscape orientation */
  isLandscape: boolean;
  /** Whether the device is currently in portrait orientation */
  isPortrait: boolean;
  /** The orientation type string (e.g. 'landscape-primary', 'portrait-primary') */
  type: string;
  /** The screen angle (0, 90, 180, 270) */
  angle: number;
}

/**
 * Hook to detect device orientation and respond to orientation changes.
 * Uses the Screen Orientation API when available, falling back to
 * window.matchMedia('(orientation: landscape)').
 *
 * Essential for the Learn page where landscape mode should maximize
 * the video player by hiding surrounding chrome.
 */
export function useOrientation(): OrientationState & {
  /** Lock the screen orientation. Requires fullscreen on most browsers. */
  lockToLandscape: () => Promise<void>;
  /** Unlock a previously locked orientation */
  unlock: () => Promise<void>;
} {
  const getOrientationState = useCallback((): OrientationState => {
    // Prefer Screen Orientation API for accurate angle/type
    if (typeof screen !== 'undefined' && screen.orientation) {
      return {
        isLandscape: screen.orientation.type.includes('landscape'),
        isPortrait: screen.orientation.type.includes('portrait'),
        type: screen.orientation.type,
        angle: screen.orientation.angle,
      };
    }

    // Fallback: matchMedia
    if (typeof window !== 'undefined') {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      return {
        isLandscape,
        isPortrait: !isLandscape,
        type: isLandscape ? 'landscape-primary' : 'portrait-primary',
        angle: isLandscape ? 90 : 0,
      };
    }

    // SSR / no window
    return {
      isLandscape: false,
      isPortrait: true,
      type: 'portrait-primary',
      angle: 0,
    };
  }, []);

  const [orientation, setOrientation] = useState<OrientationState>(getOrientationState);

  useEffect(() => {
    const handleChange = () => setOrientation(getOrientationState());

    // Listen via Screen Orientation API
    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', handleChange);
      return () => screen.orientation.removeEventListener('change', handleChange);
    }

    // Fallback: matchMedia listener
    const mql = window.matchMedia('(orientation: landscape)');
    // Modern browsers support addEventListener on MediaQueryList
    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }

    // Legacy fallback
    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, [getOrientationState]);

  const lockToLandscape = useCallback(async () => {
    try {
      if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch {
      // Orientation lock is only available in fullscreen on most browsers;
      // silently fail if not supported or denied
    }
  }, []);

  const unlock = useCallback(async () => {
    try {
      if (typeof screen !== 'undefined' && screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as any).unlock();
      }
    } catch {
      // Silently fail
    }
  }, []);

  return { ...orientation, lockToLandscape, unlock };
}
