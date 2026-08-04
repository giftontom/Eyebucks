import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { trackPixelPageView } from '../utils/metaPixel';

/**
 * Fires a Meta Pixel PageView on initial mount and on every client-side route
 * change. In a single-page app the HTML document loads only once, so without
 * this the pixel would report just the first page a visitor lands on — this is
 * what makes tracking work across "all the individual pages".
 *
 * No-op when the pixel isn't configured (window.fbq absent). Renders nothing.
 * Mount once inside <BrowserRouter>.
 */
export const MetaPixel: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Don't send internal admin routes to Meta — they carry user UUIDs
    // (e.g. /admin/users/:id) and staff traffic would pollute the ad dataset.
    // Mirrors the suppression SegmentGate applies.
    if (pathname.startsWith('/admin')) return;
    trackPixelPageView();
  }, [pathname]);

  return null;
};
