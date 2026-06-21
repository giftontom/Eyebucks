import { useEffect, useState, type RefObject } from 'react';

interface ScrollParallaxOptions {
  maxOffset?: number;
  factor?: number;
}

export const useScrollParallax = (
  ref: RefObject<HTMLElement | null>,
  { maxOffset = 40, factor = 0.15 }: ScrollParallaxOptions = {},
): number => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) {return;}

    let rafId: number | null = null;
    let inView = false;

    const compute = () => {
      rafId = null;
      const rect = el.getBoundingClientRect();
      const raw = -rect.top * factor;
      const clamped = Math.max(-maxOffset, Math.min(maxOffset, raw));
      setOffset(clamped);
    };

    const onScroll = () => {
      if (!inView || rafId !== null) {return;}
      rafId = requestAnimationFrame(compute);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) {compute();}
      },
      { threshold: 0 },
    );

    observer.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) {cancelAnimationFrame(rafId);}
    };
  }, [ref, maxOffset, factor]);

  return offset;
};
