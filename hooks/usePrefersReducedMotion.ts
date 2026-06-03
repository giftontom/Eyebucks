import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getInitial(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) { return false; }
  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks the user's OS-level `prefers-reduced-motion` setting and updates live if
 * it changes. Returns `true` when the user has requested reduced motion, so
 * components can skip entrance animations / transforms.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) { return; }
    const mq = window.matchMedia(QUERY);
    const onChange = () => setPrefers(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return prefers;
}
