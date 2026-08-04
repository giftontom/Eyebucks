/**
 * Meta (Facebook) Pixel — thin, dependency-free wrapper.
 *
 * All calls are safe no-ops when the pixel is not configured (i.e. window.fbq is
 * absent), mirroring utils/analytics.ts. The pixel is initialised once in
 * index.tsx, gated on VITE_META_PIXEL_ID — that var is set in the Cloudflare
 * Pages env for production + dev, and left unset on localhost so local/test
 * traffic never reaches Meta.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Fbq = ((...args: any[]) => void) & {
  callMethod?: (...args: any[]) => void;
  queue?: any[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

function getFbq(): Fbq | undefined {
  return (window as unknown as { fbq?: Fbq }).fbq;
}

/**
 * Inject the standard Meta Pixel bootstrap (creates the window.fbq command queue
 * and async-loads fbevents.js) and initialise the given pixel id.
 *
 * Deliberately does NOT fire the initial PageView — <MetaPixel> fires PageView on
 * mount and on every route change, remaining the single source of PageView events
 * so the first page isn't double-counted. The fbq stub queues calls made before
 * fbevents.js finishes loading, so an immediate PageView from React is safe.
 *
 * Idempotent: a second call while fbq already exists is a no-op.
 */
export function initMetaPixel(pixelId: string): void {
  try {
    const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
    if (w.fbq) return;

    const n = function (...args: any[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue!.push(args);
    } as Fbq;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    w.fbq = n;
    if (!w._fbq) w._fbq = n;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(script, first);

    // Disable Automatic Advanced Matching so fbevents cannot be remotely
    // configured (via Events Manager) to scrape + hash email/phone from our
    // Login / PhoneGate form fields. Must be set before init. Re-enable
    // intentionally only with explicit consent.
    n('set', 'autoConfig', false, pixelId);
    n('init', pixelId);
  } catch {
    // never throw — tracking must never break the app
  }
}

/** Fire a standard PageView event. No-op when the pixel isn't configured. */
export function trackPixelPageView(): void {
  try {
    getFbq()?.('track', 'PageView');
  } catch {
    /* no-op */
  }
}

/**
 * Fire a custom Meta event (e.g. 'SegmentSelected'). Used by the audience
 * selection gate to feed segment data into Meta for audience building.
 * No-op when the pixel isn't configured.
 */
export function trackPixelCustom(event: string, params?: Record<string, unknown>): void {
  try {
    getFbq()?.('trackCustom', event, params);
  } catch {
    /* no-op */
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
