import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Resets window scroll to the top on client-side navigation.
 *
 * BrowserRouter does NOT reset scroll between routes, so navigating from a
 * long page (e.g. the Storefront, scrolled down) to another page would leave
 * the new page scrolled to the previous offset. This restores the expected
 * "new page starts at the top" behaviour.
 *
 * Behaviour:
 * - Scrolls to top on PUSH / REPLACE navigations (a genuinely new page).
 * - Leaves POP navigations (browser back/forward) alone so the native scroll
 *   restoration keeps the user's previous position.
 * - If the destination has a hash, scrolls that element into view instead.
 *
 * Renders nothing. Mount once inside <BrowserRouter>.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Preserve scroll position when navigating via back/forward.
    if (navigationType === 'POP') return;

    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash, navigationType]);

  return null;
};
