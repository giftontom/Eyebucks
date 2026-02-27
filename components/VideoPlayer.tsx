import React, { useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import Hls from 'hls.js';
import { useVideoUrl } from '../hooks/useVideoUrl';
import { logger } from '../utils/logger';

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
}

export interface VideoPlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
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
      onQualityChange
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const onErrorRef = useRef(onError);
    const onQualityChangeRef = useRef(onQualityChange);

    // Keep refs in sync without triggering effects
    onErrorRef.current = onError;
    onQualityChangeRef.current = onQualityChange;

    // Fetch signed URL for the video
    const { videoUrl, hlsUrl, isLoading, error: fetchError } = useVideoUrl(
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
        if (!video || video.buffered.length === 0) return 0;
        return video.buffered.end(video.buffered.length - 1);
      }
    }));

    // Setup HLS streaming
    useEffect(() => {
      if (!videoRef.current) return;
      let destroyed = false;

      const video = videoRef.current;
      let networkRetryCount = 0;
      const MAX_NETWORK_RETRIES = 3;

      // If HLS URL is available and browser supports it
      if (hlsUrl && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });

        // Assign ref immediately so cleanup always references the correct instance
        hlsRef.current = hls;

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (destroyed) return;
          logger.debug('[HLS] Manifest parsed, ready to play');
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (destroyed) return;
          const level = hls.levels[data.level];
          if (level && onQualityChangeRef.current) {
            onQualityChangeRef.current(`${level.height}p`);
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (destroyed) return;
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
                logger.debug('[HLS] Media error, trying to recover');
                hls.recoverMediaError();
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
    }, [hlsUrl, videoUrl]);

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

    return (
      <video
        ref={videoRef}
        className={className}
        controls={controls}
        onTimeUpdate={onTimeUpdate}
        onClick={onClick}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
      />
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
