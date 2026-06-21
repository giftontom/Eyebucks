import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useMobileGestures } from '../../../hooks/useMobileGestures';

const makeVideoRef = () => ({
  current: {
    currentTime: 50,
    duration: 300,
    volume: 0.5,
    play: vi.fn(),
    pause: vi.fn(),
  } as any,
});

const makeInput = (videoRef: any) => ({
  videoRef,
  handlePlayPause: vi.fn(),
  toggleMute: vi.fn(),
  toggleFullScreen: vi.fn(),
  adjustSpeed: vi.fn(),
  setShowQualityMenu: vi.fn(),
  setVolume: vi.fn(),
  setIsMuted: vi.fn(),
  duration: 300,
});

describe('useMobileGestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns handleVideoTap and handleKeyDown', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() => useMobileGestures(makeInput(videoRef)));
    expect(result.current.handleVideoTap).toBeTypeOf('function');
    expect(result.current.handleKeyDown).toBeTypeOf('function');
    expect(result.current.doubleTapIndicator).toBeNull();
  });

  it('calls handlePlayPause on space key', () => {
    const videoRef = makeVideoRef();
    const input = makeInput(videoRef);
    const { result } = renderHook(() => useMobileGestures(input));

    act(() => {
      result.current.handleKeyDown({
        key: ' ',
        preventDefault: vi.fn(),
      } as any);
    });

    expect(input.handlePlayPause).toHaveBeenCalled();
  });

  it('seeks backward 10s on ArrowLeft', () => {
    const videoRef = makeVideoRef();
    const input = makeInput(videoRef);
    const { result } = renderHook(() => useMobileGestures(input));

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as any);
    });

    expect(videoRef.current.currentTime).toBe(40);
  });

  it('seeks forward 10s on ArrowRight', () => {
    const videoRef = makeVideoRef();
    const input = makeInput(videoRef);
    const { result } = renderHook(() => useMobileGestures(input));

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as any);
    });

    expect(videoRef.current.currentTime).toBe(60);
  });

  it('toggles fullscreen on f key', () => {
    const videoRef = makeVideoRef();
    const input = makeInput(videoRef);
    const { result } = renderHook(() => useMobileGestures(input));

    act(() => {
      result.current.handleKeyDown({
        key: 'f',
        preventDefault: vi.fn(),
      } as any);
    });

    expect(input.toggleFullScreen).toHaveBeenCalled();
  });

  it('toggles mute on m key', () => {
    const videoRef = makeVideoRef();
    const input = makeInput(videoRef);
    const { result } = renderHook(() => useMobileGestures(input));

    act(() => {
      result.current.handleKeyDown({
        key: 'm',
        preventDefault: vi.fn(),
      } as any);
    });

    expect(input.toggleMute).toHaveBeenCalled();
  });

  it('adjusts speed up on > key', () => {
    const videoRef = makeVideoRef();
    const input = makeInput(videoRef);
    const { result } = renderHook(() => useMobileGestures(input));

    act(() => {
      result.current.handleKeyDown({
        key: '>',
        preventDefault: vi.fn(),
      } as any);
    });

    expect(input.adjustSpeed).toHaveBeenCalledWith('up');
  });
});
