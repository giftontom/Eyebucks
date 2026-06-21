import { useEffect, type RefObject } from 'react';

import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface InViewActiveOptions {
  /** Selector for the elements to track. `[data-scene-card]` gets the card
   *  emphasis CSS; `[data-live]` only gets the class — its effects come from
   *  the element's own `live:` / `group-live:` utilities. */
  selector?: string;
  /** Inset (%) on each side of the chosen axis that defines the centered
   *  "active" band. */
  bandInset?: number;
  /** Only run below this viewport width in px; the hook no-ops at/above it so
   *  desktop keeps real `:hover`. 0 disables the gate. Default 768 (Tailwind md). */
  maxWidth?: number;
  /** IntersectionObserver root. Defaults to the viewport; pass a scroll
   *  container (a horizontal rail) to detect the element centered within it. */
  ioRoot?: RefObject<HTMLElement | null>;
  /** Which axis the centered band insets: `'vertical'` (page scroll, default)
   *  or `'horizontal'` (a horizontal rail — the centered card lights up). */
  bandAxis?: 'vertical' | 'horizontal';
}

/**
 * Scroll-driven stand-in for `:hover` on touch devices. Toggles an
 * `is-active` class on every `selector` descendant of `rootRef` while it
 * sits in the centered band of the scroll axis, so the element the user is
 * scrolled to gets a light emphasis (lift / border / shadow via CSS) —
 * hover never fires on touch, so this is how mobile cards "respond".
 *
 * Vertical (default) tracks page scroll; horizontal (with `ioRoot` = a rail)
 * tracks the card snapped to the rail's centre. Mirrors the project's
 * scroll-hook conventions: a single IntersectionObserver (no scroll listener)
 * plus a MutationObserver for async CMS cards. No-ops under reduced motion,
 * without IntersectionObserver, or at/above `maxWidth`.
 */
export const useInViewActive = (
  rootRef: RefObject<HTMLElement | null>,
  { selector = '[data-live]', bandInset = 45, maxWidth = 768, ioRoot, bandAxis = 'vertical' }: InViewActiveOptions = {},
): void => {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) { return; }
    if (typeof IntersectionObserver === 'undefined') { return; }

    const rootMargin = bandAxis === 'horizontal'
      ? `0px -${bandInset}% 0px -${bandInset}%`
      : `-${bandInset}% 0px -${bandInset}% 0px`;

    // The width gate is a LIVE flag read inside the observer callback rather
    // than a connect/disconnect toggle — disconnecting on resize leaves a
    // race where a late async intersection delivery re-adds `.is-active`
    // after a one-shot clear. With the observer always running and `enabled`
    // gating the toggle, crossing the breakpoint can never strand a class:
    // above maxWidth the callback only ever removes, so desktop keeps real
    // `:hover` only; back below it re-arms with no re-observe needed.
    let mq: MediaQueryList | null = null;
    const gateOn = () =>
      maxWidth <= 0 ||
      (mq ? mq.matches : typeof window !== 'undefined' && window.innerWidth < maxWidth);

    const io = new IntersectionObserver(
      (entries) => {
        const enabled = gateOn();
        for (const entry of entries) {
          entry.target.classList.toggle('is-active', enabled && entry.isIntersecting);
        }
      },
      { root: ioRoot?.current ?? null, rootMargin, threshold: 0 },
    );

    const observed = new WeakSet<Element>();
    const scan = () => {
      root.querySelectorAll(selector).forEach((el) => {
        if (!observed.has(el)) { observed.add(el); io.observe(el); }
      });
    };
    scan();

    let mo: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(scan);
      mo.observe(root, { childList: true, subtree: true });
    }

    let onChange: ((e: MediaQueryListEvent) => void) | null = null;
    if (maxWidth > 0 && typeof window.matchMedia === 'function') {
      mq = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
      // On crossing to desktop, sweep any active cards (their IO entries won't
      // re-fire until the next intersection change, so clear them now).
      onChange = (e) => {
        if (!e.matches) {
          root.querySelectorAll('.is-active').forEach((el) => el.classList.remove('is-active'));
        }
      };
      mq.addEventListener?.('change', onChange);
    }

    return () => {
      io.disconnect();
      mo?.disconnect();
      if (mq && onChange) { mq.removeEventListener?.('change', onChange); }
      root.querySelectorAll('.is-active').forEach((el) => el.classList.remove('is-active'));
    };
  }, [rootRef, prefersReducedMotion, selector, bandInset, maxWidth, ioRoot, bandAxis]);
};
