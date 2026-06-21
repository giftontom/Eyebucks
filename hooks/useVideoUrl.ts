import { useState, useEffect, useRef, useCallback } from 'react';

import { supabase } from '../services/supabase';
import { isEdgeFnAuthError, extractEdgeFnError } from '../utils/edgeFunctionError';
import { logger } from '../utils/logger';

interface UseVideoUrlResult {
  videoUrl: string | null;
  hlsUrl: string | null;
  isLoading: boolean;
  error: string | null;
  refreshUrl: () => Promise<void>;
}

/**
 * Resolves a playable HLS URL for a Bunny.net Stream video using a two-phase strategy.
 *
 * **Phase 1 (immediate):** Sets `videoUrl` and `hlsUrl` to the CDN fallback URL so the
 * video can start loading immediately (Referer-based access control).
 *
 * **Phase 2 (background):** Calls the `video-signed-url` Edge Function to get a
 * SHA256-signed URL with 1-hour expiry. On success, upgrades `hlsUrl` to the signed URL.
 * If the JWT is expired, attempts a session refresh before retrying.
 *
 * **Auto-refresh:** Schedules a refresh 5 minutes before the signed URL expires so
 * long-running viewing sessions stay authenticated.
 *
 * Cleans up the refresh timer on unmount.
 *
 * @param videoId - Bunny.net video GUID (stored in `lessons.video_id`). If `null` or
 *   `undefined`, serves `fallbackUrl` directly without calling the Edge Function.
 * @param lessonId - UUID of the lesson; sent to the Edge Function for entitlement + logging.
 * @param fallbackUrl - CDN URL served immediately and used as fallback if signing fails.
 * @returns Object with:
 *   - `videoUrl` — the current URL suitable for a plain `<video src>` (non-HLS)
 *   - `hlsUrl` — the current HLS playlist URL (`.m3u8`); may be signed or CDN URL
 *   - `isLoading` — `true` during the initial fetch only (not during background refresh)
 *   - `error` — error message string if signing failed; `null` on success
 *   - `refreshUrl` — imperative function to re-fetch the signed URL on demand
 *
 * @example
 * ```tsx
 * const { hlsUrl, isLoading, error } = useVideoUrl(videoId, lessonId, fallbackUrl);
 * if (isLoading) return <Spinner />;
 * ```
 */
export const useVideoUrl = (
  videoId: string | null | undefined,
  lessonId: string | null | undefined,
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
    // No videoId — use fallback directly
    if (!videoId) {
      const url = fallbackUrl || null;
      setVideoUrl(url);
      setHlsUrl(url && url.includes('.m3u8') ? url : null);
      return;
    }

    if (!isRefresh) {
      setError(null);
      setIsLoading(true);
    }

    // Prepare CDN fallback URL (used only if the Edge Function fails —
    // not served immediately, because unsigned CDN URLs return 403 when
    // Bunny token auth is enabled, which would trigger spurious HLS errors
    // before the signed URL arrives).
    const directUrl = fallbackUrl || null;
    const directHlsUrl = directUrl && directUrl.includes('.m3u8') ? directUrl : null;

    // Try to get a signed URL from the Edge Function (enhances security when token auth is enabled)
    try {
      const body: Record<string, string> = { videoId };
      if (lessonId) {body.lessonId = lessonId;}

      let { data, error: fnError } = await supabase.functions.invoke('video-signed-url', {
        body,
      });

      if (!mountedRef.current) {return;}

      if (fnError) {
        if (isEdgeFnAuthError(fnError)) {
          const { data: retryRefresh, error: retryRefreshError } = await supabase.auth.refreshSession();
          if (retryRefreshError || !retryRefresh.session) {
            logger.error('[Video] Session expired, using direct URL');
            if (mountedRef.current) {
              if (!directHlsUrl) {
                setError('Your session has expired. Please log in again.');
              }
              setIsLoading(false);
            }
            return;
          }
          const { data: retryData, error: retryError } = await supabase.functions.invoke('video-signed-url', {
            body,
          });
          if (!mountedRef.current) {return;}
          if (retryError) {
            logger.error('[Video] Signed URL retry failed, using direct URL');
            if (mountedRef.current) {
              if (!directHlsUrl) {
                setError(retryError.message || 'Failed to load video');
              }
              setIsLoading(false);
            }
            return;
          }
          if (!retryData?.success) {
            logger.error('[Video] Signed URL retry returned error:', retryData?.error);
            if (mountedRef.current) {
              if (!directHlsUrl) {
                setError(retryData?.error || 'Failed to load video');
              }
              setIsLoading(false);
            }
            return;
          }
          data = retryData;
        } else {
          logger.error('[Video] Edge Function error, falling back to CDN URL:', fnError);
          if (mountedRef.current) {
            if (!directHlsUrl) {
              setError(fnError.message || 'Failed to load video');
            }
            setIsLoading(false);
          }
          return;
        }
      }

      if (!data?.success) {
        logger.error('[Video] Edge Function returned error:', data?.error);
        if (mountedRef.current) {
          if (!directHlsUrl) {
            setError(data?.error || 'Failed to load video');
          }
          setIsLoading(false);
        }
        return;
      }

      // Upgrade to signed URL (better security when token auth is enabled on CDN)
      if (mountedRef.current) {
        setVideoUrl(data.signedUrl);
        setHlsUrl(data.hlsUrl || data.signedUrl);
        setError(null);
        setIsLoading(false);
        refreshRetryRef.current = 0;

        // Schedule refresh before expiration
        if (data.expiresAt) {
          const now = Date.now();
          const expiresAt = data.expiresAt * 1000;
          const refreshTime = expiresAt - now - (5 * 60 * 1000);

          if (refreshTime > 0) {
            if (refreshTimerRef.current) {clearTimeout(refreshTimerRef.current);}
            refreshTimerRef.current = setTimeout(() => {
              // eslint-disable-next-line react-hooks/immutability
              if (mountedRef.current) {fetchSignedUrl(true);}
            }, refreshTime);
          }
        }
      }
    } catch (err: any) {
      if (!mountedRef.current) {return;}
      logger.error('[Video] Failed to fetch signed URL, using direct URL:', err.message);
      setIsLoading(false);
      if (isRefresh && refreshRetryRef.current < 2) {
        refreshRetryRef.current++;
        if (refreshTimerRef.current) {clearTimeout(refreshTimerRef.current);}
        refreshTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {fetchSignedUrl(true);}
        }, 30_000);
      }
    }
  }, [videoId, lessonId, fallbackUrl]);

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
