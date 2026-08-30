import { useEffect } from 'react';

/**
 * Keeps `--vv-bottom-inset` on `<html>` in sync with the gap between the layout
 * viewport's bottom edge and the *visible* one.
 *
 * Mobile browsers collapse and expand their toolbar as you scroll. That resizes
 * the visual viewport, but `position: fixed` elements are laid out against the
 * layout viewport — so a bottom-anchored bar drifts by the toolbar's height
 * while the two disagree.
 *
 * Measured on a real device: the bottom nav snapped between two positions 40px
 * apart, 75 times in 28 seconds, and the whole viewport shifted with it. It was
 * most obvious on short pages like the catalog (~2.7 screens, versus ~18 on the
 * home page), where you reach the end within a couple of swipes and each bounce
 * re-triggers the toolbar.
 *
 * Consumers subtract this value to stay glued to what the user can actually
 * see. It is a CSS variable rather than React state deliberately: this updates
 * on every scroll frame, and re-rendering the nav that often would be worse
 * than the drift it fixes.
 *
 * No-ops where `visualViewport` is unavailable, leaving the variable at its
 * `0px` default — the previous behaviour exactly.
 */
export function useVisualViewportInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) { return; }

    const root = document.documentElement;
    let frame = 0;

    const apply = () => {
      frame = 0;
      // How far the visible bottom sits above the layout bottom. `offsetTop`
      // covers the pinch-zoom/keyboard case where the visual viewport is also
      // scrolled within the layout one.
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Sub-pixel churn would repaint the blur behind the nav for nothing.
      root.style.setProperty('--vv-bottom-inset', `${Math.round(inset)}px`);
    };

    const schedule = () => {
      if (frame) { return; }
      frame = requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    return () => {
      if (frame) { cancelAnimationFrame(frame); }
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      root.style.removeProperty('--vv-bottom-inset');
    };
  }, []);
}
