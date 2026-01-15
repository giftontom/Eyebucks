import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';
import { useCloudinaryVideo } from '../hooks/useCloudinaryVideo';

interface CloudinaryVideoPlayerProps {
  cloudinaryPublicId?: string;
  fallbackUrl: string;
  className?: string;
  controls?: boolean;
  onTimeUpdate?: () => void;
  onClick?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onLoadedMetadata?: () => void;
}

export interface CloudinaryVideoPlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
}

/**
 * Enhanced video player with Cloudinary CDN and HLS streaming support
 *
 * Features:
 * - Automatic signed URL fetching for Cloudinary videos
 * - HLS adaptive bitrate streaming
 * - Fallback to standard video for non-HLS browsers
 * - Seamless integration with existing video controls
 */
export const CloudinaryVideoPlayer = forwardRef<CloudinaryVideoPlayerHandle, CloudinaryVideoPlayerProps>(
  (
    {
      cloudinaryPublicId,
      fallbackUrl,
      className,
      controls = false,
      onTimeUpdate,
      onClick,
      onEnded,
      onError,
      onLoadedMetadata
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    // Fetch signed URL if Cloudinary video
    const { videoUrl, hlsUrl, isLoading, error: fetchError } = useCloudinaryVideo(
      cloudinaryPublicId,
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
      }
    }));

    // Setup HLS streaming
    useEffect(() => {
      if (!videoRef.current) return;

      const video = videoRef.current;

      // If HLS URL is available and browser supports it
      if (hlsUrl && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[HLS] Manifest parsed, ready to play');
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[HLS] Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('[HLS] Network error, trying to recover');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('[HLS] Media error, trying to recover');
                hls.recoverMediaError();
                break;
              default:
                console.log('[HLS] Fatal error, destroying HLS');
                hls.destroy();
                if (onError) {
                  onError('Failed to load video stream');
                }
                break;
            }
          }
        });

        hlsRef.current = hls;

        return () => {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      }
      // If browser has native HLS support (Safari)
      else if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
      }
      // Fallback to standard video URL
      else if (videoUrl) {
        video.src = videoUrl;
      }
    }, [hlsUrl, videoUrl, onError]);

    // Handle fetch errors
    useEffect(() => {
      if (fetchError && onError) {
        onError(fetchError);
      }
    }, [fetchError, onError]);

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
      />
    );
  }
);

CloudinaryVideoPlayer.displayName = 'CloudinaryVideoPlayer';
