import { useEffect, type RefObject } from 'react';

/**
 * Scroll-progress driver for pinned "scroll-jack" sections. Given a tall
 * `trackRef` that contains a `position: sticky` stage, it reports how far the
 * track has scrolled past the top of the viewport as a value in [0, 1] —
 * 0 when the track's top reaches the viewport top, 1 when its bottom does.
 * Consumers map that progress to a transform (horizontal card scrub) or a
 * discrete step index.
 *
 * Mirrors the project's scroll-hook conventions (see useSceneGrade): a single
 * requestAnimationFrame, passive scroll/resize listeners, an Intersection
 * Observer in-view gate, a ResizeObserver for layout shifts, and NO React
 * state (it calls `onProgress` directly). Pass a STABLE `onProgress`
 * (useCallback) so the effect isn't torn down each render.
 *
 * `enabled=false` detaches everything and reports 0 once — used to switch the
 * pin off on desktop (card galleries) or under reduced motion.
 */
export const useScrollProgress = (
  trackRef: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
  enabled = true,
): void => {
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !enabled) { onProgress(0); return; }

    let rafId: number | null = null;
    let inView = false;

    const compute = () => {
      rafId = null;
      const vh = window.innerHeight || 1;
      const r = track.getBoundingClientRect();
      const span = r.height - vh; // vertical distance available to scrub
      const p = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
      onProgress(p);
    };

    const schedule = () => {
      if (inView && rafId === null) { rafId = requestAnimationFrame(compute); }
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => { inView = entry.isIntersecting; if (inView) { compute(); } },
        { threshold: 0 },
      );
      io.observe(track);
    } else {
      inView = true;
    }

    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(schedule);
      ro.observe(track);
    }

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      io?.disconnect();
      ro?.disconnect();
      if (rafId !== null) { cancelAnimationFrame(rafId); }
    };
  }, [trackRef, onProgress, enabled]);
};
