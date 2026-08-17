import { useEffect, type RefObject } from 'react';

import { logger } from '../utils/logger';

/**
 * Attaches an HLS (`.m3u8`) source to a plain `<video>` element for lightweight
 * playback (e.g. a course trailer on the public storefront).
 *
 * - Safari / iOS play HLS natively → the URL is set directly as `src`.
 * - Other browsers need MediaSource → `hls.js` is **dynamically imported** only
 *   when actually needed, so the ~160KB library never lands in the storefront's
 *   initial bundle.
 * - A non-`.m3u8` URL (plain mp4/webm) is set directly as `src`.
 * - A `null`/empty URL clears the source (the element shows its poster).
 *
 * Unlike the full {@link VideoPlayer}, this has no quality switching, retry, or
 * error overlay — it is intentionally minimal for autoplay/loop marketing video.
 *
 * @param videoRef - ref to the target `<video>` element
 * @param hlsUrl - the signed HLS URL (or plain media URL), or null
 */
export function useHlsAttach(
  videoRef: RefObject<HTMLVideoElement | null>,
  hlsUrl: string | null | undefined,
): void {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) { return; }

    if (!hlsUrl) {
      video.removeAttribute('src');
      video.load?.();
      return;
    }

    /**
     * The `autoplay` attribute only fires the browser's autoplay algorithm for a
     * source present at load time. This source is attached *after* mount (it
     * needs a signed URL round-trip), which mobile browsers do not re-trigger —
     * so nudge playback explicitly once the media is ready.
     *
     * Deliberately does not touch `muted`: the caller owns that (a muted
     * element autoplays under policy, and an unmuted one only got that way via
     * a user gesture, which also permits playback). Forcing it here would
     * silently re-mute a visitor mid-trailer when the signed URL refreshes.
     */
    const nudgePlay = () => {
      void video.play().catch(() => { /* autoplay blocked — poster stays */ });
    };

    const isHls = hlsUrl.includes('.m3u8');

    // Native HLS (Safari/iOS) or a plain mp4/webm URL — set directly.
    if (!isHls || video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', nudgePlay, { once: true });
      return () => video.removeEventListener('loadedmetadata', nudgePlay);
    }

    // Other browsers: lazy-load hls.js and attach.
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;

    import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled || !videoRef.current) { return; }
        if (Hls.isSupported()) {
          const instance = new Hls({ enableWorker: true });
          hls = instance;
          instance.loadSource(hlsUrl);
          instance.attachMedia(videoRef.current);
          instance.on(Hls.Events.MANIFEST_PARSED, nudgePlay);
        } else {
          // Last resort: let the browser try (will likely just show the poster).
          videoRef.current.src = hlsUrl;
          videoRef.current.addEventListener('loadedmetadata', nudgePlay, { once: true });
        }
      })
      .catch((err) => {
        logger.warn('[useHlsAttach] hls.js load failed:', err);
        if (!cancelled && videoRef.current) { videoRef.current.src = hlsUrl; }
      });

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', nudgePlay);
      if (hls) { hls.destroy(); }
    };
  }, [videoRef, hlsUrl]);
}
