import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    functions: { invoke: vi.fn() },
    auth: { refreshSession: vi.fn() },
  };
  return { mockSupabase };
});

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { useVideoUrl } from '../../../hooks/useVideoUrl';

describe('useVideoUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return fallback URL when videoId is null', async () => {
    const { result } = renderHook(() =>
      useVideoUrl(null, null, 'https://fallback.com/video.mp4')
    );

    await waitFor(() => {
      expect(result.current.videoUrl).toBe('https://fallback.com/video.mp4');
    });
    expect(result.current.hlsUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch signed URL for videoId', async () => {
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'valid' } },
      error: null,
    });
    mockSupabase.functions.invoke.mockResolvedValue({
      data: {
        success: true,
        signedUrl: 'https://cdn.bunny.net/signed/video.m3u8?token=abc',
        hlsUrl: 'https://cdn.bunny.net/guid/playlist.m3u8',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      error: null,
    });

    const { result } = renderHook(() =>
      useVideoUrl('video-123', 'module-1', 'fallback.mp4')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.videoUrl).toBe('https://cdn.bunny.net/signed/video.m3u8?token=abc');
    expect(result.current.hlsUrl).toBe('https://cdn.bunny.net/guid/playlist.m3u8');
    expect(result.current.error).toBeNull();
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('video-signed-url', {
      body: { videoId: 'video-123', moduleId: 'module-1' },
    });
  });

  it('should set error and fallback on failure', async () => {
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'valid' } },
      error: null,
    });
    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Internal server error' },
    });

    const { result } = renderHook(() =>
      useVideoUrl('video-123', null, 'fallback.mp4')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Internal server error');
    expect(result.current.videoUrl).toBe('fallback.mp4');
  });

  it('should refresh session and retry on auth error', async () => {
    // Proactive refresh succeeds (but token may still be stale in edge cases)
    // Then reactive refresh after 401 also succeeds
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'refreshed' } },
      error: null,
    });
    // First call returns 401 auth error
    mockSupabase.functions.invoke
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Edge Function returned a non-2xx status code', context: new Response('', { status: 401 }) },
      })
      // Retry after refresh succeeds
      .mockResolvedValueOnce({
        data: { success: true, signedUrl: 'https://cdn.bunny.net/refreshed.m3u8', hlsUrl: null },
        error: null,
      });

    const { result } = renderHook(() =>
      useVideoUrl('video-123', null, 'fallback.mp4')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
    expect(result.current.videoUrl).toBe('https://cdn.bunny.net/refreshed.m3u8');
    expect(result.current.error).toBeNull();
  });

  it('should show session expired when refresh fails', async () => {
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid Refresh Token' },
    });

    const { result } = renderHook(() =>
      useVideoUrl('video-123', null, 'fallback.mp4')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Your session has expired. Please log in again.');
    expect(result.current.videoUrl).toBe('fallback.mp4');
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('should send request without moduleId when null', async () => {
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'valid' } },
      error: null,
    });
    mockSupabase.functions.invoke.mockResolvedValue({
      data: { success: true, signedUrl: 'url', hlsUrl: null },
      error: null,
    });

    renderHook(() => useVideoUrl('vid', null, 'fb.mp4'));

    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('video-signed-url', {
        body: { videoId: 'vid' },
      });
    });
  });

  it('should set error when success is false', async () => {
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'valid' } },
      error: null,
    });
    mockSupabase.functions.invoke.mockResolvedValue({
      data: { success: false, error: 'Video not found' },
      error: null,
    });

    const { result } = renderHook(() =>
      useVideoUrl('bad-vid', null, 'fallback.mp4')
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Video not found');
    });
    expect(result.current.videoUrl).toBe('fallback.mp4');
  });
});
