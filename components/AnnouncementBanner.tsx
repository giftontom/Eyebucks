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
  const textColor = (meta.textColor as string) || 'var(--text-1)';
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
