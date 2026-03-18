import Hls from 'hls.js';
import { Film } from 'lucide-react';
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useState } from 'react';

import { useVideoUrl } from '../hooks/useVideoUrl';
import { logger } from '../utils/logger';

/** A single HLS quality level exposed via the `onLevelsLoaded` callback. */
export interface QualityLevel {
  /** HLS.js level index. Pass `-1` to `setQualityLevel` for automatic quality selection. */
  index: number;
  /** Vertical resolution in pixels (e.g., 720, 1080). */
  height: number;
  /** Human-readable label (e.g., `"720p"`). */
  label: string;
}

/**
 * Props for the VideoPlayer component.
 *
 * VideoPlayer uses `React.forwardRef` and exposes a `VideoPlayerHandle` imperative API
 * for play/pause/seek/quality/PiP controls. HLS.js is loaded lazily (only on this component).
 *
 * URL resolution is handled by `useVideoUrl`: the CDN URL (`fallbackUrl`) is served
 * immediately while the signed URL is fetched in the background.
 */
interface VideoPlayerProps {
  /** Bunny.net video GUID (not a URL). Used to fetch the signed HLS URL. */
  videoId?: string;
  /** Database module UUID — passed to `useVideoUrl` for logging. */
  moduleId?: string;
  /**
   * CDN URL served immediately while the signed URL is loading.
   * Also used as the permanent fallback if the `video-signed-url` Edge Function fails.
   */
  fallbackUrl: string;
  /** Additional CSS class names applied to the `<video>` element or loading/error containers. */
  className?: string;
  /** Whether to show native browser video controls. Default: `false`. */
  controls?: boolean;
  /** Called on every `timeupdate` event from the video element. */
  onTimeUpdate?: () => void;
  /** Called when the user clicks the video element. */
  onClick?: () => void;
  /** Called when the video reaches the end. */
  onEnded?: () => void;
  /** Called with a human-readable error string when a fatal playback error occurs. */
  onError?: (error: string) => void;
  /** Called when the video metadata (duration, dimensions) has loaded. */
  onLoadedMetadata?: () => void;
  /** Called with the new quality label (e.g., `"720p"`) when HLS switches quality levels. */
  onQualityChange?: (quality: string) => void;
  /** Called once after the HLS manifest is parsed with all available quality levels. */
  onLevelsLoaded?: (levels: QualityLevel[]) => void;
}

/**
 * Imperative handle exposed by VideoPlayer via `React.forwardRef`.
 *
 * Attach a ref of this type to VideoPlayer to control playback programmatically:
 * ```tsx
 * const videoRef = useRef<VideoPlayerHandle>(null);
 * <VideoPlayer ref={videoRef} ... />
 * videoRef.current?.play();
 * ```
 */
export interface VideoPlayerHandle {
  /** Starts playback. Returns a Promise that resolves when playback begins. */
  play: () => Promise<void>;
  /** Pauses playback. */
  pause: () => void;
  /** Reloads the video source. */
  load: () => void;
  /** Re-fetches the signed URL from the Edge Function and swaps the HLS source in-place. */
  refreshUrl: () => Promise<void>;
  /** Toggles Picture-in-Picture mode. Exits PiP if already active. */
  requestPiP: () => Promise<void>;
  /** Sets the HLS quality level by index. Pass `-1` for automatic quality selection. */
  setQualityLevel: (index: number) => void;
  /** Current video playback position in seconds. Settable to seek. */
  currentTime: number;
  /** Total video duration in seconds. `0` before metadata loads. */
  duration: number;
  /** `true` if video is currently paused. */
  paused: boolean;
  /** Current volume (0–1). Settable. */
  volume: number;
  /** Whether audio is muted. Settable. */
  muted: boolean;
  /** Current video source URL. Settable. */
  src: string;
  /** The parent DOM element of the video element, or `null`. */
  parentElement: HTMLElement | null;
  /** Current playback rate (1 = normal speed). Settable. */
  playbackRate: number;
  /** End of the currently buffered range in seconds. `0` if nothing is buffered. */
  buffered: number;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  (
    {
      videoId,
      moduleId,
      fallbackUrl,
      className,
      controls = false,
      onTimeUpdate,
      onClick,
      onEnded,
      onError,
      onLoadedMetadata,
      onQualityChange,
      onLevelsLoaded
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const onErrorRef = useRef(onError);
    const onQualityChangeRef = useRef(onQualityChange);
    const onLevelsLoadedRef = useRef(onLevelsLoaded);
    // Tracks whether HLS already fired an error so the native <video> onError doesn't double-fire
    const hlsErrorFiredRef = useRef(false);

    // Keep refs in sync without triggering effects
    onErrorRef.current = onError;
    onQualityChangeRef.current = onQualityChange;
    onLevelsLoadedRef.current = onLevelsLoaded;

    // Fetch signed URL for the video
    const { videoUrl, hlsUrl, isLoading, error: fetchError, refreshUrl } = useVideoUrl(
      videoId,
      moduleId,
      fallbackUrl
    );

    // Expose video element methods via ref
    useImperativeHandle(ref, () => ({
      play: async () => {
        if (videoRef.current) {
          return videoRef.current.play();
        }
        return Promise.resolve();
      },
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      load: () => {
        if (videoRef.current) {
          videoRef.current.load();
        }
      },
      refreshUrl: async () => {
        await refreshUrl();
      },
      requestPiP: async () => {
        if (videoRef.current && document.pictureInPictureEnabled) {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await videoRef.current.requestPictureInPicture();
          }
        }
      },
      setQualityLevel: (index: number) => {
        if (hlsRef.current) {
          hlsRef.current.currentLevel = index;
        }
      },
      get currentTime() {
        return videoRef.current?.currentTime || 0;
      },
      set currentTime(value: number) {
        if (videoRef.current) {
          videoRef.current.currentTime = value;
        }
      },
      get duration() {
        return videoRef.current?.duration || 0;
      },
      get paused() {
        return videoRef.current?.paused ?? true;
      },
      get volume() {
        return videoRef.current?.volume || 1;
      },
      set volume(value: number) {
        if (videoRef.current) {
          videoRef.current.volume = value;
        }
      },
      get muted() {
        return videoRef.current?.muted ?? false;
      },
      set muted(value: boolean) {
        if (videoRef.current) {
          videoRef.current.muted = value;
        }
      },
      get src() {
        return videoRef.current?.src || '';
      },
      set src(value: string) {
        if (videoRef.current) {
          videoRef.current.src = value;
        }
      },
      get parentElement() {
        return videoRef.current?.parentElement || null;
      },
      get playbackRate() {
        return videoRef.current?.playbackRate || 1;
      },
      set playbackRate(value: number) {
        if (videoRef.current) {
          videoRef.current.playbackRate = value;
        }
      },
      get buffered() {
        const video = videoRef.current;
        if (!video || video.buffered.length === 0) {return 0;}
        return video.buffered.end(video.buffered.length - 1);
      }
    }));

    // Track previous HLS URL to detect in-place refreshes vs module changes
    const prevHlsUrlRef = useRef<string | null>(null);
    const prevModuleIdRef = useRef<string | null | undefined>(null);

    // Setup HLS streaming
    useEffect(() => {
      if (!videoRef.current) {return;}
      let destroyed = false;

      const video = videoRef.current;
      let networkRetryCount = 0;
      let mediaRetryCount = 0;
      const MAX_NETWORK_RETRIES = 3;
      const MAX_MEDIA_RETRIES = 3;

      const isModuleChange = prevModuleIdRef.current !== moduleId;
      const isUrlRefreshOnly = !isModuleChange && prevHlsUrlRef.current !== null && hlsUrl !== prevHlsUrlRef.current;
      prevHlsUrlRef.current = hlsUrl;
      prevModuleIdRef.current = moduleId;

      // Reset HLS error flag for each new source load
      hlsErrorFiredRef.current = false;

      // If HLS URL is available and browser supports it
      if (hlsUrl && Hls.isSupported()) {
        // VP-1: URL refresh (same module, new signed URL) → swap source in-place
        if (isUrlRefreshOnly && hlsRef.current) {
          const savedTime = video.currentTime;
          const wasPaused = video.paused;
          hlsRef.current.loadSource(hlsUrl);
          // Restore playback position after manifest re-parses
          const restoreTime = () => {
            if (destroyed) {return;}
            video.currentTime = savedTime;
            if (!wasPaused) {video.play().catch((err) => logger.debug('[VideoPlayer] play() interrupted during URL refresh:', err));}
            hlsRef.current?.off(Hls.Events.MANIFEST_PARSED, restoreTime);
          };
          hlsRef.current.on(Hls.Events.MANIFEST_PARSED, restoreTime);
          logger.debug('[HLS] URL refreshed in-place, preserving playback at', savedTime);
          return; // No cleanup needed — reusing existing HLS instance
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          xhrSetup: (xhr) => {
            // Ensure Referer header is sent (Bunny CDN uses referrer-based access control)
            xhr.withCredentials = false;
          },
        });

        // Assign ref immediately so cleanup always references the correct instance
        hlsRef.current = hls;

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (destroyed) {return;}
          logger.debug('[HLS] Manifest parsed, ready to play');
          if (onLevelsLoadedRef.current && hls.levels.length > 0) {
            const levels: QualityLevel[] = hls.levels.map((level, i) => ({
              index: i,
              height: level.height,
              label: `${level.height}p`,
            }));
            onLevelsLoadedRef.current(levels);
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (destroyed) {return;}
          const level = hls.levels[data.level];
          if (level && onQualityChangeRef.current) {
            onQualityChangeRef.current(`${level.height}p`);
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (destroyed) {return;}
          logger.error('[HLS] Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                networkRetryCount++;
                if (networkRetryCount <= MAX_NETWORK_RETRIES) {
                  logger.debug(`[HLS] Network error, retry ${networkRetryCount}/${MAX_NETWORK_RETRIES}`);
                  hls.startLoad();
                } else {
                  logger.debug('[HLS] Network error, max retries reached');
                  hls.destroy();
                  if (!destroyed && onErrorRef.current) {
                    hlsErrorFiredRef.current = true;
                    onErrorRef.current('Network error: unable to load video. Please check your connection.');
                  }
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                mediaRetryCount++;
                if (mediaRetryCount <= MAX_MEDIA_RETRIES) {
                  logger.debug(`[HLS] Media error, recovery attempt ${mediaRetryCount}/${MAX_MEDIA_RETRIES}`);
                  hls.recoverMediaError();
                } else {
                  logger.debug('[HLS] Media error, max retries reached');
                  hls.destroy();
                  if (!destroyed && onErrorRef.current) {
                    hlsErrorFiredRef.current = true;
                    onErrorRef.current('Video playback error. Please try refreshing the page.');
                  }
                }
                break;
              default:
                logger.debug('[HLS] Fatal error, destroying HLS');
                hls.destroy();
                if (!destroyed && onErrorRef.current) {
                  hlsErrorFiredRef.current = true;
                  onErrorRef.current('Failed to load video stream. The video format may not be supported.');
                }
                break;
            }
          }
        });

        return () => {
          destroyed = true;
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      }
      // If browser has native HLS support (Safari)
      else if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;

        return () => {
          destroyed = true;
          video.src = '';
          video.load();
        };
      }
      // Fallback to standard video URL
      else if (videoUrl) {
        video.src = videoUrl;

        return () => {
          destroyed = true;
          video.src = '';
          video.load();
        };
      }

      return () => {
        destroyed = true;
      };
    }, [hlsUrl, videoUrl, moduleId]);

    // Track fetch errors so video element onError can check
    const fetchErrorRef = useRef<string | null>(null);
    fetchErrorRef.current = fetchError;

    // Handle fetch errors
    useEffect(() => {
      if (fetchError && onErrorRef.current) {
        onErrorRef.current(fetchError);
      }
    }, [fetchError]);

    // Loading state
    if (isLoading) {
      return (
        <div className={`${className} flex items-center justify-center bg-black`}>
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      );
    }

    // No video available
    if (!videoUrl && !hlsUrl && !isLoading) {
      return (
        <div className={`${className} flex items-center justify-center bg-black`}>
          <div className="text-center text-neutral-500">
            <Film size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No video available for this module</p>
          </div>
        </div>
      );
    }

    return (
      <video
        ref={videoRef}
        className={className}
        controls={controls}
        onTimeUpdate={onTimeUpdate}
        onClick={onClick}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Course video player"
        onError={() => {
          if (videoRef.current?.error && onErrorRef.current && !fetchErrorRef.current && !hlsErrorFiredRef.current) {
            const code = videoRef.current.error.code;
            const messages: Record<number, string> = {
              1: 'Video loading was aborted.',
              2: 'Network error while loading video.',
              3: 'Video decoding failed.',
              4: 'Video format not supported.',
            };
            onErrorRef.current(messages[code] || 'Failed to load video.');
          }
        }}
        playsInline
        preload="metadata"
      />
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
