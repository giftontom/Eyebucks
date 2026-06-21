import { render, screen, waitFor, act } from '@testing-library/react';
import React, { createRef } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockUseVideoUrl } = vi.hoisted(() => ({
  mockUseVideoUrl: vi.fn(),
}));

vi.mock('../../../hooks/useVideoUrl', () => ({
  useVideoUrl: mockUseVideoUrl,
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { VideoPlayer, VideoPlayerHandle } from '../../../components/VideoPlayer';

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVideoUrl.mockReturnValue({
      videoUrl: null,
      hlsUrl: null,
      isLoading: false,
      error: null,
      refreshUrl: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('shows loading spinner while URL resolves', () => {
    mockUseVideoUrl.mockReturnValue({
      videoUrl: null,
      hlsUrl: null,
      isLoading: true,
      error: null,
      refreshUrl: vi.fn(),
    });

    render(<VideoPlayer videoId="vid-1" fallbackUrl="" />);
    expect(screen.getByText(/Loading video/i)).toBeInTheDocument();
  });

  it('shows empty state when no video url is available', () => {
    render(<VideoPlayer videoId={undefined} fallbackUrl="" />);
    expect(screen.getByText(/No video available for this module/i)).toBeInTheDocument();
  });

  it('renders <video> element when a videoUrl resolves', () => {
    mockUseVideoUrl.mockReturnValue({
      videoUrl: 'https://cdn.example.com/video.mp4',
      hlsUrl: null,
      isLoading: false,
      error: null,
      refreshUrl: vi.fn(),
    });

    const { container } = render(<VideoPlayer fallbackUrl="" />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('aria-label', 'Course video player');
  });

  it('invokes onError when useVideoUrl reports a fetch error', async () => {
    const onError = vi.fn();
    mockUseVideoUrl.mockReturnValue({
      videoUrl: null,
      hlsUrl: null,
      isLoading: false,
      error: 'Failed to load signed URL',
      refreshUrl: vi.fn(),
    });

    render(<VideoPlayer videoId="vid-1" fallbackUrl="" onError={onError} />);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to load signed URL');
    });
  });

  it('exposes imperative ref handle that proxies to <video>', async () => {
    mockUseVideoUrl.mockReturnValue({
      videoUrl: 'https://cdn.example.com/video.mp4',
      hlsUrl: null,
      isLoading: false,
      error: null,
      refreshUrl: vi.fn().mockResolvedValue(undefined),
    });

    const ref = createRef<VideoPlayerHandle>();
    const { container } = render(<VideoPlayer ref={ref} fallbackUrl="" />);
    const video = container.querySelector('video') as HTMLVideoElement;

    const playSpy = vi.spyOn(video, 'play').mockResolvedValue();
    const pauseSpy = vi.spyOn(video, 'pause').mockImplementation(() => {});
    const loadSpy = vi.spyOn(video, 'load').mockImplementation(() => {});

    await act(async () => {
      await ref.current?.play();
    });
    ref.current?.pause();
    ref.current?.load();

    expect(playSpy).toHaveBeenCalled();
    expect(pauseSpy).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();
    expect(ref.current?.parentElement).toBe(video.parentElement);
    expect(ref.current?.paused).toBeDefined();
  });

  it('refreshUrl handle delegates to useVideoUrl.refreshUrl', async () => {
    const refreshUrl = vi.fn().mockResolvedValue(undefined);
    mockUseVideoUrl.mockReturnValue({
      videoUrl: 'https://cdn.example.com/video.mp4',
      hlsUrl: null,
      isLoading: false,
      error: null,
      refreshUrl,
    });

    const ref = createRef<VideoPlayerHandle>();
    render(<VideoPlayer ref={ref} fallbackUrl="" />);

    await act(async () => {
      await ref.current?.refreshUrl();
    });
    expect(refreshUrl).toHaveBeenCalledOnce();
  });
});
