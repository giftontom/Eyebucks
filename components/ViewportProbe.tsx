import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Temporary on-device readout for diagnosing bottom-nav movement.
 *
 * Renders ONLY when the URL carries `?vvprobe=1`, so it cannot reach a normal
 * visitor. It exists because the bottom nav was observed jumping ~40px on a
 * real phone, and that behaviour cannot be reproduced in headless Chromium,
 * which has no browser chrome to collapse. Rather than keep guessing from
 * video, this reports what the device itself says.
 *
 * `navBottomGap` is the number that matters: the distance from the nav's bottom
 * edge to the bottom of the visible viewport. It should be 0 and stay 0. If it
 * moves while scrolling, the nav is not tracking the visible area; if it holds
 * at 0 while the bar still appears to move, the whole page is being shifted by
 * the browser and the nav is innocent.
 *
 * Delete this component once the cause is settled.
 */
export const ViewportProbe: React.FC = () => {
  const { search } = useLocation();
  const enabled = new URLSearchParams(search).get('vvprobe') === '1';
  const [s, setS] = useState<Record<string, number | string>>({});

  useEffect(() => {
    if (!enabled) { return; }
    let frame = 0;
    let minGap = Infinity;
    let maxGap = -Infinity;

    const read = () => {
      frame = 0;
      const vv = window.visualViewport;
      const nav = document.querySelector('nav[aria-label="Mobile navigation"]');
      const r = nav?.getBoundingClientRect();
      // Bottom of what the user can actually see, in layout-viewport coords.
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const gap = r ? Math.round(visibleBottom - r.bottom) : NaN;
      if (Number.isFinite(gap)) {
        minGap = Math.min(minGap, gap);
        maxGap = Math.max(maxGap, gap);
      }
      setS({
        'innerH': window.innerHeight,
        'vv.height': vv ? Math.round(vv.height) : 'n/a',
        'vv.offsetTop': vv ? Math.round(vv.offsetTop) : 'n/a',
        'vv.scale': vv ? Number(vv.scale.toFixed(2)) : 'n/a',
        'navTop': r ? Math.round(r.top) : 'n/a',
        'navBottom': r ? Math.round(r.bottom) : 'n/a',
        'navBottomGap': Number.isFinite(gap) ? gap : 'n/a',
        'gap min→max': Number.isFinite(minGap) ? `${minGap} → ${maxGap}` : 'n/a',
        'scrollY': Math.round(window.scrollY),
      });
    };

    const schedule = () => { if (!frame) { frame = requestAnimationFrame(read); } };
    read();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      if (frame) { cancelAnimationFrame(frame); }
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [enabled]);

  if (!enabled) { return null; }

  return (
    <div
      // Pinned top-left so it cannot be confused with, or occluded by, the bar
      // being measured.
      className="fixed top-0 left-0 z-[9999] m-1 rounded bg-black/85 px-2 py-1 font-mono text-[10px] leading-tight text-lime-300 pointer-events-none"
      aria-hidden="true"
    >
      {Object.entries(s).map(([k, v]) => (
        <div key={k}>{k}: {String(v)}</div>
      ))}
    </div>
  );
};
