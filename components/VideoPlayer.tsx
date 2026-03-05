import Hls from 'hls.js';
import { Film } from 'lucide-react';
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useState } from 'react';

import { useVideoUrl } from '../hooks/useVideoUrl';
import { logger } from '../utils/logger';

export interface QualityLevel {
  index: number;  // HLS level index (-1 = auto)
  height: number; // e.g. 720, 1080
  label: string;  // e.g. "720p"
}

interface VideoPlayerProps {
  videoId?: string;
  moduleId?: string;
  fallbackUrl: string;
  className?: string;
  controls?: boolean;
  onTimeUpdate?: () => void;
  onClick?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onLoadedMetadata?: () => void;
  onQualityChange?: (quality: string) => void;
  onLevelsLoaded?: (levels: QualityLevel[]) => void;
}

export interface VideoPlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
  refreshUrl: () => Promise<void>;
  requestPiP: () => Promise<void>;
  setQualityLevel: (index: number) => void;
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  src: string;
  parentElement: HTMLElement | null;
  playbackRate: number;
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
            if (!wasPaused) {video.play().catch(() => {});}
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
                    onErrorRef.current('Video playback error. Please try refreshing the page.');
                  }
                }
                break;
              default:
                logger.debug('[HLS] Fatal error, destroying HLS');
                hls.destroy();
                if (!destroyed && onErrorRef.current) {
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
          if (videoRef.current?.error && onErrorRef.current && !fetchErrorRef.current) {
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
