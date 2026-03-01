import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

interface UseVideoUrlResult {
  videoUrl: string | null;
  hlsUrl: string | null;
  isLoading: boolean;
  error: string | null;
  refreshUrl: () => Promise<void>;
}

export const useVideoUrl = (
  videoId: string | null | undefined,
  moduleId: string | null | undefined,
  fallbackUrl: string
): UseVideoUrlResult => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchSignedUrl = useCallback(async (isRefresh = false) => {
    if (!videoId) {
      setVideoUrl(fallbackUrl);
      setHlsUrl(null);
      return;
    }

    // Only show loading spinner on initial fetch, not refreshes
    if (!isRefresh) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const body: Record<string, string> = { videoId };
      if (moduleId) body.moduleId = moduleId;

      const { data, error: fnError } = await supabase.functions.invoke('video-signed-url', {
        body,
      });

      if (!mountedRef.current) return;

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to get video URL');

      setVideoUrl(data.signedUrl);
      setHlsUrl(data.hlsUrl || null);

      // Schedule URL refresh before expiration (5 minutes before expiry)
      if (data.expiresAt) {
        const now = Date.now();
        const expiresAt = data.expiresAt * 1000;
        const refreshTime = expiresAt - now - (5 * 60 * 1000);

        if (refreshTime > 0) {
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = setTimeout(() => {
            if (mountedRef.current) fetchSignedUrl(true);
          }, refreshTime);
        }
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      logger.error('Failed to fetch signed video URL:', err);
      if (!isRefresh) {
        setError(err.message || 'Failed to load video');
        setVideoUrl(fallbackUrl);
        setHlsUrl(null);
      } else {
        setError('Video session expired. Click retry to reload.');
      }
    } finally {
      if (!isRefresh && mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [videoId, moduleId, fallbackUrl]);

  const refreshUrl = useCallback(async () => {
    await fetchSignedUrl(true);
  }, [fetchSignedUrl]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSignedUrl();

    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [fetchSignedUrl]);

  return {
    videoUrl,
    hlsUrl,
    isLoading,
    error,
    refreshUrl,
  };
};
