import { X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { siteContentApi } from '../services/api/siteContent.api';
import { logger } from '../utils/logger';

import type { SiteContentItem } from '../types';

export const AnnouncementBanner: React.FC = () => {
  const [banner, setBanner] = useState<SiteContentItem | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    siteContentApi.getBySection('banner').then(items => {
      // Clean up stale dismissed banner IDs from localStorage
      const activeIds = new Set(items.map(i => i.id));
      const raw = localStorage.getItem('eyebuckz_banner_dismissed_ids');
      const dismissedIds: string[] = raw ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
      const pruned = dismissedIds.filter(id => activeIds.has(id));
      localStorage.setItem('eyebuckz_banner_dismissed_ids', JSON.stringify(pruned));

      if (items.length > 0) {
        const item = items[0];
        if (dismissedIds.includes(item.id)) {
          setDismissed(true);
        } else {
          setBanner(item);
        }
      }
    }).catch(err => {
      logger.error('[AnnouncementBanner] Failed to fetch banner:', err);
    });
  }, []);

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
