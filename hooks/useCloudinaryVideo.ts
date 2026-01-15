import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

interface UseCloudinaryVideoResult {
  videoUrl: string | null;
  hlsUrl: string | null;
  isLoading: boolean;
  error: string | null;
  refreshUrl: () => Promise<void>;
}

interface CloudinaryVideoResponse {
  signedUrl: string;
  hlsUrl?: string;
  expiresAt: number;
}

/**
 * Custom hook for handling Cloudinary videos with signed URLs and HLS streaming
 *
 * @param cloudinaryPublicId - The Cloudinary public ID (if video is hosted on Cloudinary)
 * @param fallbackUrl - Fallback URL (e.g., YouTube URL) if not using Cloudinary
 * @returns Video URLs, loading state, error, and refresh function
 */
export const useCloudinaryVideo = (
  cloudinaryPublicId: string | null | undefined,
  fallbackUrl: string
): UseCloudinaryVideoResult => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchSignedUrl = async () => {
    if (!cloudinaryPublicId) {
      // Use fallback URL for non-Cloudinary videos (e.g., YouTube)
      setVideoUrl(fallbackUrl);
      setHlsUrl(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<CloudinaryVideoResponse>(
        `/api/videos/signed-url/${encodeURIComponent(cloudinaryPublicId)}`
      );

      setVideoUrl(response.signedUrl);
      setHlsUrl(response.hlsUrl || null);

      // Schedule URL refresh before expiration (refresh 5 minutes before expiry)
      if (response.expiresAt) {
        const now = Date.now();
        const expiresAt = response.expiresAt * 1000; // Convert to milliseconds
        const refreshTime = expiresAt - now - (5 * 60 * 1000); // 5 minutes before expiry

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
      // Fallback to original URL on error
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

    // Cleanup timer on unmount
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [cloudinaryPublicId, fallbackUrl]);

  return {
    videoUrl,
    hlsUrl,
    isLoading,
    error,
    refreshUrl
  };
};
