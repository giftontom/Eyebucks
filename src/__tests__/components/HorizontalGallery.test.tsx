import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { HorizontalGallery } from '../../../components/HorizontalGallery';

// Control the reduced-motion preference per test (useInViewActive reads it).
const { mockReducedMotion } = vi.hoisted(() => ({ mockReducedMotion: vi.fn() }));
vi.mock('../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockReducedMotion(),
}));

const cards = [
  <div key="a" data-scene-card>Card A</div>,
  <div key="b" data-scene-card>Card B</div>,
  <div key="c" data-scene-card>Card C</div>,
];

describe('HorizontalGallery', () => {
  beforeEach(() => {
    mockReducedMotion.mockReturnValue(false);
  });

  it('renders the heading and every card', () => {
    render(
      <HorizontalGallery count={3} desktopGrid="md:grid-cols-3" heading={<h2>My Heading</h2>}>
        {cards}
      </HorizontalGallery>,
    );
    expect(screen.getByText('My Heading')).toBeInTheDocument();
    expect(screen.getByText('Card A')).toBeInTheDocument();
    expect(screen.getByText('Card B')).toBeInTheDocument();
    expect(screen.getByText('Card C')).toBeInTheDocument();
  });

  it('renders a native horizontal snap rail (no pinned scroll-jack)', () => {
    const { container } = render(
      <HorizontalGallery count={3} desktopGrid="md:grid-cols-3">{cards}</HorizontalGallery>,
    );
    // simple rail: a horizontal snap scroller, no tall pin track
    const rail = container.querySelector('.scrollbar-hide');
    expect(rail).not.toBeNull();
    expect(rail?.className).toContain('overflow-x-auto');
    expect(rail?.className).toContain('snap-x');
    expect(container.querySelector('.hgallery-track')).toBeNull();
  });

  it('keeps the desktop grid columns on the rail container', () => {
    const { container } = render(
      <HorizontalGallery count={3} desktopGrid="md:grid-cols-4">{cards}</HorizontalGallery>,
    );
    const rail = container.querySelector('.scrollbar-hide');
    expect(rail?.className).toContain('md:grid');
    expect(rail?.className).toContain('md:grid-cols-4');
  });

  it('renders all cards under reduced motion too', () => {
    mockReducedMotion.mockReturnValue(true);
    render(
      <HorizontalGallery count={3} desktopGrid="md:grid-cols-3">{cards}</HorizontalGallery>,
    );
    expect(screen.getByText('Card A')).toBeInTheDocument();
    expect(screen.getByText('Card C')).toBeInTheDocument();
  });
});
