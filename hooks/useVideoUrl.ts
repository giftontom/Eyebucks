import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface UseVideoUrlResult {
  videoUrl: string | null;
  hlsUrl: string | null;
  isLoading: boolean;
  error: string | null;
  refreshUrl: () => Promise<void>;
}

/**
 * Custom hook for handling video URLs with signed tokens and HLS streaming
 * Uses Supabase Edge Function for signed URL generation
 */
export const useVideoUrl = (
  videoId: string | null | undefined,
  fallbackUrl: string
): UseVideoUrlResult => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchSignedUrl = async () => {
    if (!videoId) {
      setVideoUrl(fallbackUrl);
      setHlsUrl(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('video-signed-url', {
        body: { videoId },
      });

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
          const timer = setTimeout(() => {
            fetchSignedUrl();
          }, refreshTime);
          setRefreshTimer(timer);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch signed video URL:', err);
      setError(err.message || 'Failed to load video');
      setVideoUrl(fallbackUrl);
      setHlsUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUrl = async () => {
    await fetchSignedUrl();
  };

  useEffect(() => {
    fetchSignedUrl();

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [videoId, fallbackUrl]);

  return {
    videoUrl,
    hlsUrl,
    isLoading,
    error,
    refreshUrl,
  };
};
