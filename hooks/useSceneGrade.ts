import { useEffect, type RefObject } from 'react';

const smoothstep = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/**
 * Scroll-driven scene grade for the cinematic landing canvas.
 *
 * Instead of painting a dark→light gradient at a fixed spot on the page
 * (which the eye always finds — a finite strip between two flat fields
 * reads as an object no matter how smooth), the whole viewport's backdrop
 * is ONE tone at every instant: a fixed dark plate crossfades out as the
 * user scrolls from the hero scene into the light catalog, and back in
 * around mid-page dark sections. The change lives in scrolled TIME, not
 * page SPACE, so there is never a boundary on screen to recognize —
 * like a film cross-dissolve between scenes.
 *
 * Darkness is written straight to the plate's `opacity` (compositor-only,
 * no React re-renders) plus a `--scene-dark` custom property on the plate's
 * parent for any CSS that wants to follow the grade. The hero contributes
 * darkness while its bottom edge sits low in the viewport; any element
 * marked `data-scene-dark` (e.g. the Instructors section) contributes
 * darkness while it occupies the viewport. Color-only, no motion — safe
 * under prefers-reduced-motion (WCAG C39).
 */
export const useSceneGrade = (
  plateRef: RefObject<HTMLElement | null>,
  heroRef: RefObject<HTMLElement | null>,
): void => {
  useEffect(() => {
    const plate = plateRef.current;
    const hero = heroRef.current;
    if (!plate || !hero) {return;}

    let rafId: number | null = null;
    let darkText = false; // hysteresis latch for the bistable text colour

    const compute = () => {
      rafId = null;
      const vh = window.innerHeight || 1;

      // Hero scene: fully dark while the hero/ticker dominates the
      // viewport; dissolves across ~0.6 viewport of travel as the hero's
      // bottom edge rises, completing before the catalog heading reaches
      // reading position.
      const heroBottom = hero.getBoundingClientRect().bottom;
      let darkness = smoothstep((heroBottom - 0.10 * vh) / (0.62 * vh));

      // Mid-page dark islands: grade in as the section approaches the
      // viewport, hold while it occupies it, grade out as it leaves.
      // The enter ramp LEADS the section (starts darkening ~0.45vh before
      // its top reaches the fold, full dark by the time its top is 15%
      // down) so the canvas is already dark when the section's own white
      // heading scrolls in — otherwise that heading flashes on a light
      // canvas. The flanking light sections are scene-adaptive, so they
      // flip to light text during this lead/lag window.
      for (const el of document.querySelectorAll<HTMLElement>('[data-scene-dark]')) {
        const r = el.getBoundingClientRect();
        const enter = smoothstep((1.45 * vh - r.top) / (0.6 * vh));
        const exit = smoothstep(r.bottom / (0.6 * vh));
        darkness = Math.max(darkness, Math.min(enter, exit));
      }

      const v = darkness.toFixed(4);
      plate.style.opacity = v;
      const parent = plate.parentElement;
      if (parent) {
        parent.style.setProperty('--scene-dark', v);
        // BISTABLE adaptive text — no outline, no mid-grey blend. Measured
        // calibration (backdrop luminance behind the headings sampled live
        // across all three dissolves) shows the canvas crosses the point
        // where white and ink have EQUAL contrast at plate opacity ≈ 0.51,
        // consistently across regions. So we just flip the text between its
        // ink and white states there, with hysteresis (white once darkness
        // passes 0.55, back to ink below 0.47) to avoid flip-flop if the
        // floating orbs jitter the value. A CSS `color` transition smooths
        // the switch over time — so any PARKED scroll frame shows a single
        // solid, properly-contrasting colour, never a half-faded blend.
        darkText = darkness > 0.55 ? true : darkness < 0.47 ? false : darkText;
        parent.classList.toggle('scene-dark-text', darkText);
      }
    };

    const schedule = () => {
      if (rafId !== null) {return;}
      rafId = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    // Layout changes (images, CMS-driven sections) move the anchors.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(schedule);
      ro.observe(document.documentElement);
    }

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      if (rafId !== null) {cancelAnimationFrame(rafId);}
    };
  }, [plateRef, heroRef]);
};
