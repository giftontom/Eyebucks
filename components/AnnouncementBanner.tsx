import { X } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { useSiteSection } from '../context/SiteContentContext';

const DISMISSED_KEY = 'eyebuckz_banner_dismissed_ids';

function readDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Parse a #rgb / #rrggbb / rgb()/rgba() colour to [r,g,b]. Returns null for
 * anything else (e.g. a CSS variable like `var(--text-1)`), which the caller
 * treats as "leave it to the theme".
 */
function parseColor(c: string): [number, number, number] | null {
  const s = (c || '').trim();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) { h = h.split('').map((x) => x + x).join(''); }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = s.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Guarantees the banner text is legible on its background. An admin can (and
 * did — #003376 text on a #003366 background) pick two near-identical colours,
 * which renders an invisible message on a coloured strip that looks like an
 * empty gap. If the requested text colour is unparseable or fails a minimum
 * contrast, fall back to black or white — whichever reads on the background.
 * When the background is a theme variable we leave the colours to the theme.
 */
function readableTextColor(bg: string, requested: string): string {
  const bgRgb = parseColor(bg);
  if (!bgRgb) { return requested; }
  const reqRgb = parseColor(requested);
  if (reqRgb && contrastRatio(bgRgb, reqRgb) >= 3) { return requested; }
  return relativeLuminance(bgRgb) > 0.4 ? '#111111' : '#ffffff';
}

export const AnnouncementBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const rows = useSiteSection('banner');

  // Drop dismissal records for banners the admin has since deleted, so the IDs
  // don't accumulate forever. Purely housekeeping — it cannot change which
  // banner shows, because the check below only tests IDs that are still live.
  useEffect(() => {
    if (!rows) { return; }
    const activeIds = new Set(rows.map(i => i.id));
    const pruned = readDismissedIds().filter(id => activeIds.has(id));
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(pruned));
    } catch {
      // Storage unavailable — dismissal just won't persist.
    }
  }, [rows]);

  const banner = useMemo(() => {
    if (!rows) { return null; }
    // Take the first row that actually says something. An active row with a
    // blank title used to render anyway: `py-2.5` plus a background colour and
    // no text, i.e. a coloured empty band across the top of the page. Skipping
    // empty rows also means a blank row left at order_index 0 no longer hides a
    // real announcement sitting behind it.
    const dismissedIds = readDismissedIds();
    return rows.find(item =>
      (item.title?.trim() || item.body?.trim()) && !dismissedIds.includes(item.id),
    ) ?? null;
  }, [rows]);

  if (!banner || dismissed) {return null;}

  const meta = banner.metadata || {};
  const bgColor = (meta.bgColor as string) || 'var(--page-alt)';
  // Never trust the stored text colour blindly — enforce readable contrast so a
  // bad colour pick can't turn the banner into an invisible strip.
  const textColor = readableTextColor(bgColor, (meta.textColor as string) || 'var(--text-1)');
  const linkUrl = meta.linkUrl as string | undefined;
  const linkText = (meta.linkText as string) || 'Learn more';
  const isDismissible = meta.dismissible !== false;

  const handleDismiss = () => {
    setDismissed(true);
    const raw = localStorage.getItem('eyebuckz_banner_dismissed_ids');
    const dismissedIds: string[] = raw ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
    if (!dismissedIds.includes(banner.id)) {
      dismissedIds.push(banner.id);
      localStorage.setItem('eyebuckz_banner_dismissed_ids', JSON.stringify(dismissedIds));
    }
  };

  return (
    <div
      className="relative flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span className="font-semibold">{banner.title}</span>
      {banner.body && (
        <span className="opacity-80">{banner.body}</span>
      )}
      {linkUrl && (
        <a
          href={linkUrl}
          className="underline underline-offset-2 font-medium hover:opacity-80 transition"
          style={{ color: textColor }}
        >
          {linkText}
        </a>
      )}
      {isDismissible && (
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/20 transition"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
