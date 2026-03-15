import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analytics } from '../../../utils/analytics';

describe('analytics', () => {
  const mockPosthog = {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as Record<string, unknown>).posthog = mockPosthog;
  });

  it('track calls posthog.capture with event and props', () => {
    analytics.track('course_viewed', { courseId: 'c1' });
    expect(mockPosthog.capture).toHaveBeenCalledWith('course_viewed', { courseId: 'c1' });
  });

  it('track is a no-op when posthog not initialized', () => {
    (window as unknown as Record<string, unknown>).posthog = undefined;
    expect(() => analytics.track('event')).not.toThrow();
  });

  it('identify calls posthog.identify', () => {
    analytics.identify('u1', { name: 'Alice' });
    expect(mockPosthog.identify).toHaveBeenCalledWith('u1', { name: 'Alice' });
  });

  it('identify is a no-op when posthog not initialized', () => {
    (window as unknown as Record<string, unknown>).posthog = undefined;
    expect(() => analytics.identify('u1')).not.toThrow();
  });

  it('reset calls posthog.reset', () => {
    analytics.reset();
    expect(mockPosthog.reset).toHaveBeenCalled();
  });

  it('reset is a no-op when posthog not initialized', () => {
    (window as unknown as Record<string, unknown>).posthog = undefined;
    expect(() => analytics.reset()).not.toThrow();
  });

  it('track does not throw if posthog.capture throws', () => {
    mockPosthog.capture.mockImplementation(() => { throw new Error('posthog error'); });
    expect(() => analytics.track('event')).not.toThrow();
  });
});
