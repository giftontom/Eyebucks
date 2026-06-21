import React, { useState, useRef, useEffect } from 'react';

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export const STAGGER_MS = 80;

/**
 * Entrance directions for the scroll reveal.
 * - `up`    — fade + rise (default; unchanged legacy behavior).
 * - `right` — on touch/mobile the element starts offset to the right and
 *   slides left into place ("right→left as you scroll"); on `md+` it falls
 *   back to a subtle rise so desktop keeps a reveal alongside its hover
 *   effects. The mobile slide-in stands in for hover, which never fires on
 *   touch.
 * - `scale` — fade + gentle scale-up, for hero/feature emphasis.
 * Every variant keeps the `opacity-0`↔`opacity-100` toggle so content can
 * never get stuck hidden (see FadeIn regression test).
 */
export type RevealDirection = 'up' | 'right' | 'scale';

const REVEAL: Record<RevealDirection, { hidden: string; visible: string }> = {
  up: { hidden: 'opacity-0 translate-y-12', visible: 'opacity-100 translate-y-0' },
  right: {
    hidden: 'opacity-0 translate-x-8 md:translate-x-0 md:translate-y-8',
    visible: 'opacity-100 translate-x-0 md:translate-y-0',
  },
  scale: { hidden: 'opacity-0 scale-95', visible: 'opacity-100 scale-100' },
};

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  threshold?: number;
  /** Entrance direction (default `up`). `right` gives the mobile slide-in. */
  direction?: RevealDirection;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  className = '',
  threshold = 0.1,
  direction = 'up',
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const noObserver = typeof IntersectionObserver === 'undefined';
  // Start visible (no entrance animation) when the user prefers reduced motion or
  // there's no IntersectionObserver, so content can never get stuck hidden.
  const [isVisible, setIsVisible] = useState(() => prefersReducedMotion || noObserver);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion || noObserver) { return; }
    const el = ref.current;
    if (!el) { return; }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {setIsVisible(true); observer.unobserve(entry.target);}
      },
      { threshold, rootMargin: '0px 0px -50px 0px' },
    );
    observer.observe(el);
    return () => {observer.unobserve(el);};
  }, [threshold, prefersReducedMotion, noObserver]);

  const reveal = REVEAL[direction];

  return (
    <div
      ref={ref}
      className={`${prefersReducedMotion ? '' : 'transition-all duration-700 ease-out transform'} ${isVisible ? reveal.visible : reveal.hidden} ${className}`}
      style={prefersReducedMotion ? undefined : { transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};
FadeIn.displayName = 'FadeIn';
