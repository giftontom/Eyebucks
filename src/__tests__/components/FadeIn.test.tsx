import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FadeIn } from '../../../components/FadeIn';

// Control the reduced-motion preference per test.
const { mockReducedMotion } = vi.hoisted(() => ({ mockReducedMotion: vi.fn() }));
vi.mock('../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockReducedMotion(),
}));

/**
 * Regression guard for U1: scroll-reveal content must never get stuck at
 * `opacity:0`. FadeIn should render visible-by-default when the user prefers
 * reduced motion or when IntersectionObserver is unavailable (bots, no-JS paint).
 */
describe('FadeIn — content can never get stuck hidden (U1)', () => {
  beforeEach(() => {
    mockReducedMotion.mockReturnValue(false);
  });

  it('renders children visible immediately when reduced motion is preferred', () => {
    mockReducedMotion.mockReturnValue(true);
    render(<FadeIn><p>Important copy</p></FadeIn>);
    const wrapper = screen.getByText('Important copy').parentElement as HTMLElement;
    expect(wrapper.className).toContain('opacity-100');
    expect(wrapper.className).not.toContain('opacity-0');
  });

  it('renders children visible when IntersectionObserver is unavailable', () => {
    const g = globalThis as { IntersectionObserver?: typeof IntersectionObserver };
    const original = g.IntersectionObserver;
    delete g.IntersectionObserver;
    try {
      render(<FadeIn><p>Fallback copy</p></FadeIn>);
      const wrapper = screen.getByText('Fallback copy').parentElement as HTMLElement;
      expect(wrapper.className).toContain('opacity-100');
    } finally {
      g.IntersectionObserver = original;
    }
  });

  it('starts hidden only when motion is allowed and an observer exists (progressive enhancement)', () => {
    render(<FadeIn><p>Animated copy</p></FadeIn>);
    const wrapper = screen.getByText('Animated copy').parentElement as HTMLElement;
    expect(wrapper.className).toContain('opacity-0');
  });

  it('direction="right" uses a horizontal slide-in on mobile while still toggling opacity', () => {
    render(<FadeIn direction="right"><p>Sliding card</p></FadeIn>);
    const wrapper = screen.getByText('Sliding card').parentElement as HTMLElement;
    // hidden state: offset to the right on mobile, resets to a subtle rise on md+
    expect(wrapper.className).toContain('translate-x-8');
    expect(wrapper.className).toContain('md:translate-x-0');
    // opacity must still toggle so content can never get stuck hidden
    expect(wrapper.className).toContain('opacity-0');
  });

  it('direction="right" is visible-by-default under reduced motion (no transform stuck)', () => {
    mockReducedMotion.mockReturnValue(true);
    render(<FadeIn direction="right"><p>Reduced slide</p></FadeIn>);
    const wrapper = screen.getByText('Reduced slide').parentElement as HTMLElement;
    expect(wrapper.className).toContain('opacity-100');
    expect(wrapper.className).not.toContain('opacity-0');
    expect(wrapper.className).not.toContain('translate-x-8');
  });
});
