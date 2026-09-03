import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useHlsAttach } from '../../../hooks/useHlsAttach';

/**
 * Regression cover for the mobile trailer autoplay fix.
 *
 * The hero trailer source is attached *after* mount (it needs a signed-URL
 * round-trip). The `autoplay` attribute only drives the browser's autoplay
 * algorithm for a source present at load time, so on iOS/Android the trailer
 * silently never started and visitors only ever saw the poster. The hook now
 * nudges `play()` once the media reports it is ready.
 */
describe('useHlsAttach', () => {
  let video: HTMLVideoElement;
  let play: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    video = document.createElement('video');
    play = vi.fn().mockResolvedValue(undefined);
    video.play = play as unknown as HTMLVideoElement['play'];
    // jsdom has no codec support; a plain mp4 URL takes the "set src directly"
    // branch, which is also the iOS/native-HLS path.
    video.canPlayType = vi.fn().mockReturnValue('') as unknown as HTMLVideoElement['canPlayType'];
    document.body.appendChild(video);
  });

  const ref = () => ({ current: video });

  it('sets the source for a plain media URL', () => {
    renderHook(() => useHlsAttach(ref(), 'https://cdn.example.com/trailer.mp4'));
    expect(video.src).toContain('trailer.mp4');
  });

  it('starts playback once the media is ready (mobile autoplay nudge)', () => {
    renderHook(() => useHlsAttach(ref(), 'https://cdn.example.com/trailer.mp4'));

    // Nothing should have been forced before the media is ready.
    expect(play).not.toHaveBeenCalled();

    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('does not override the caller\'s mute state', () => {
    // A visitor who unmuted has already given a gesture; re-muting them on a
    // signed-URL refresh would be a regression.
    video.muted = false;
    renderHook(() => useHlsAttach(ref(), 'https://cdn.example.com/trailer.mp4'));

    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(video.muted).toBe(false);
  });

  it('swallows a rejected play() so a blocked autoplay just leaves the poster', async () => {
    play.mockRejectedValueOnce(new DOMException('NotAllowedError'));
    renderHook(() => useHlsAttach(ref(), 'https://cdn.example.com/trailer.mp4'));

    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'));
      await Promise.resolve();
    });

    expect(play).toHaveBeenCalled();
  });

  it('stops nudging after unmount', () => {
    const { unmount } = renderHook(() => useHlsAttach(ref(), 'https://cdn.example.com/trailer.mp4'));
    unmount();

    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(play).not.toHaveBeenCalled();
  });

  it('clears the source when there is no trailer', () => {
    video.src = 'https://cdn.example.com/old.mp4';
    renderHook(() => useHlsAttach(ref(), null));
    expect(video.getAttribute('src')).toBeNull();
  });
});
