import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * How long to keep looking for a hash target before giving up.
 *
 * Every route is `React.lazy`, so on a cold load of `/#pricing` the section does
 * not exist yet when this effect first runs — the chunk is still downloading.
 * The browser's own fragment scroll has already given up by then, which is why
 * the admin CMS "View on site" links used to dump you at the top of the page.
 */
const HASH_TARGET_TIMEOUT_MS = 4000;

/**
 * Resets window scroll to the top on client-side navigation.
 *
 * BrowserRouter does NOT reset scroll between routes, so navigating from a
 * long page (e.g. the Storefront, scrolled down) to another page would leave
 * the new page scrolled to the previous offset. This restores the expected
 * "new page starts at the top" behaviour.
 *
 * Behaviour:
 * - If the destination has a hash, scrolls that element into view — waiting for
 *   it to appear if the route's chunk has not mounted yet. This runs for POP
 *   too, because the initial page load of a deep link IS a POP.
 * - Otherwise scrolls to top on PUSH / REPLACE navigations (a genuinely new page).
 * - Leaves hash-less POP navigations (browser back/forward) alone so the native
 *   scroll restoration keeps the user's previous position.
 *
 * Renders nothing. Mount once inside <BrowserRouter>.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      let raf = 0;
      const deadline = Date.now() + HASH_TARGET_TIMEOUT_MS;
      let cancelled = false;

      // Poll on animation frames rather than a MutationObserver: the target
      // usually appears within a frame or two of the chunk resolving, and this
      // stops as soon as it lands (or the deadline passes) either way.
      const tryScroll = () => {
        if (cancelled) { return; }
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView();
          return;
        }
        if (Date.now() < deadline) {
          raf = requestAnimationFrame(tryScroll);
        }
      };
      raf = requestAnimationFrame(tryScroll);

      return () => { cancelled = true; cancelAnimationFrame(raf); };
    }

    // Preserve scroll position when navigating via back/forward.
    if (navigationType === 'POP') { return; }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash, navigationType]);

  return null;
};
