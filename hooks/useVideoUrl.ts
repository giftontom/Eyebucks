import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';
import { isEdgeFnAuthError, extractEdgeFnError } from '../utils/edgeFunctionError';

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
  const refreshRetryRef = useRef(0);

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

      // Proactively refresh auth to ensure a valid JWT before calling Edge Function.
      // Prevents 401s from expired tokens (common after idle tabs or long sessions).
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        throw new Error('Your session has expired. Please log in again.');
      }

      let { data, error: fnError } = await supabase.functions.invoke('video-signed-url', {
        body,
      });

      if (!mountedRef.current) return;

      if (fnError) {
        // If it's an auth/JWT error, try refreshing the session once and retry
        if (isEdgeFnAuthError(fnError)) {
          const { data: retryRefresh, error: retryRefreshError } = await supabase.auth.refreshSession();
          if (retryRefreshError || !retryRefresh.session) {
            throw new Error('Your session has expired. Please log in again.');
          }
          // Retry the Edge Function call with the refreshed session
          const { data: retryData, error: retryError } = await supabase.functions.invoke('video-signed-url', {
            body,
          });
          if (!mountedRef.current) return;
          if (retryError) {
            throw new Error(await extractEdgeFnError(retryError, retryError.message));
          }
          if (!retryData?.success) throw new Error(retryData?.error || 'Failed to get video URL');
          // Use retry data instead — jump to success handling below
          data = retryData;
        } else {
          throw new Error(await extractEdgeFnError(fnError, fnError.message));
        }
      }
      if (!data?.success) throw new Error(data?.error || 'Failed to get video URL');

      setVideoUrl(data.signedUrl);
      setHlsUrl(data.hlsUrl || null);
      refreshRetryRef.current = 0;
      if (isRefresh) setError(null);

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
        setHlsUrl(fallbackUrl.includes('.m3u8') ? fallbackUrl : null);
      } else if (refreshRetryRef.current < 2) {
        // Silent retry — video is still playing with existing URL
        refreshRetryRef.current++;
        logger.error(`[Video] Background refresh failed (attempt ${refreshRetryRef.current}/2), retrying in 30s`);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          if (mountedRef.current) fetchSignedUrl(true);
        }, 30_000);
      } else {
        // All retries exhausted — show real error
        refreshRetryRef.current = 0;
        setError(err.message || 'Video session expired. Please retry.');
      }
    } finally {
      if (!isRefresh && mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [videoId, moduleId, fallbackUrl]);

  const refreshUrl = useCallback(async () => {
    await fetchSignedUrl(false);
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
