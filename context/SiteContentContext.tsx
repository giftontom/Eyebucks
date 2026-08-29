import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { siteContentApi } from '../services/api';
import { logger } from '../utils/logger';

import type { SiteContentItem } from '../types';

/** CMS rows grouped by section key, each already ordered by `order_index`. */
export type SiteContentMap = Record<string, SiteContentItem[]>;

/**
 * Bumped whenever the cached shape changes, so an old payload in a returning
 * visitor's browser is discarded rather than mis-read.
 */
const CACHE_KEY = 'eyebuckz.siteContent.v1';

/**
 * How long a cached payload may be used for the first paint. Past this we still
 * paint from cache (stale copy beats a flash of months-old hardcoded text) but
 * the revalidation below replaces it as soon as it lands.
 */
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CacheEnvelope {
  savedAt: number;
  sections: SiteContentMap;
}

/**
 * Read the last known CMS payload synchronously, during render.
 *
 * This is the whole point of the cache: `useState`'s initialiser runs before
 * the first paint, so a returning visitor's first frame already has the real
 * copy instead of the hardcoded fallbacks. Anything that throws (Safari private
 * mode, disabled storage, corrupt JSON) degrades to `null` -> fallbacks.
 */
function readCache(): SiteContentMap | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) { return null; }
    const parsed = JSON.parse(raw) as CacheEnvelope | null;
    if (!parsed || typeof parsed !== 'object' || !parsed.sections) { return null; }
    if (typeof parsed.savedAt !== 'number') { return null; }
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) { return null; }
    return parsed.sections;
  } catch {
    return null;
  }
}

function writeCache(sections: SiteContentMap): void {
  try {
    const envelope: CacheEnvelope = { savedAt: Date.now(), sections };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or storage disabled — the cache is an optimisation, not
    // a requirement. The network fetch still populates this render.
  }
}

function groupBySection(items: SiteContentItem[]): SiteContentMap {
  const map: SiteContentMap = {};
  for (const item of items) {
    (map[item.section] ??= []).push(item);
  }
  return map;
}

const SiteContentContext = createContext<SiteContentMap | null>(null);

/**
 * Loads every CMS row once and shares it with all sections.
 *
 * Replaces the previous per-section `siteContentApi.getBySection()` calls,
 * which produced one request per section and a staggered "old copy -> real
 * copy" swap on every page load.
 */
export const SiteContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sections, setSections] = useState<SiteContentMap | null>(readCache);

  useEffect(() => {
    let cancelled = false;
    siteContentApi.getAllActive()
      .then((items) => {
        if (cancelled) { return; }
        const map = groupBySection(items);
        setSections(map);
        writeCache(map);
      })
      .catch((err) => logger.warn('[SiteContent] load failed, using cache/defaults:', err));
    return () => { cancelled = true; };
  }, []);

  return (
    <SiteContentContext.Provider value={sections}>
      {children}
    </SiteContentContext.Provider>
  );
};

/**
 * Rows for one CMS section.
 *
 * Returns `null` while the payload is genuinely unknown (first ever visit, no
 * cache, fetch not back yet) so a caller can fall back to its hardcoded
 * defaults. Once loaded, a section with no rows returns `[]` — the CMS is
 * authoritative and empty, which callers also treat as "use defaults".
 *
 * Derive your copy from this during render (`useMemo`) rather than mirroring it
 * into state in an effect: state-plus-effect repaints once with the fallback
 * before the real value lands, which is the flash this provider exists to kill.
 */
export function useSiteSection(section: string): SiteContentItem[] | null {
  const map = useContext(SiteContentContext);
  return useMemo(() => (map ? (map[section] ?? []) : null), [map, section]);
}
