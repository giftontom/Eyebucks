import React, { useState, useRef, useEffect } from 'react';

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export const STAGGER_MS = 80;

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  threshold?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  className = '',
  threshold = 0.1,
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

  return (
    <div
      ref={ref}
      className={`${prefersReducedMotion ? '' : 'transition-all duration-1000 ease-out transform'} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
      style={prefersReducedMotion ? undefined : { transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};
FadeIn.displayName = 'FadeIn';
