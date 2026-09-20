import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetAllActive } = vi.hoisted(() => ({ mockGetAllActive: vi.fn() }));

vi.mock('../../../services/api', () => ({
  siteContentApi: { getAllActive: mockGetAllActive },
}));

vi.mock('../../../utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { SiteContentProvider, useSiteSection } from '../../../context/SiteContentContext';

const CACHE_KEY = 'eyebuckz.siteContent.v1';

const row = (section: string, title: string) => ({
  id: `${section}-1`,
  section,
  title,
  body: '',
  metadata: {},
  orderIndex: 0,
  isActive: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

/** Renders the hero row's title, or a sentinel when the section is unknown. */
const Probe: React.FC = () => {
  const rows = useSiteSection('hero');
  if (rows === null) { return <span>UNKNOWN</span>; }
  return <span>{rows[0]?.title ?? 'EMPTY'}</span>;
};

const renderProbe = () => render(<SiteContentProvider><Probe /></SiteContentProvider>);

describe('SiteContentContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetAllActive.mockResolvedValue([]);
  });

  describe('first ever visit (no cache)', () => {
    it('reports the section as unknown on the first render, so callers use their defaults', () => {
      mockGetAllActive.mockReturnValue(new Promise(() => { /* never resolves */ }));
      renderProbe();
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });

    it('serves the fetched rows once the request resolves', async () => {
      mockGetAllActive.mockResolvedValue([row('hero', 'Fetched Heading')]);
      renderProbe();
      await waitFor(() => expect(screen.getByText('Fetched Heading')).toBeInTheDocument());
    });

    it('writes the payload to localStorage for the next visit', async () => {
      mockGetAllActive.mockResolvedValue([row('hero', 'Fetched Heading')]);
      renderProbe();
      await waitFor(() => expect(localStorage.getItem(CACHE_KEY)).not.toBeNull());
    });
  });

  describe('returning visit (warm cache)', () => {
    beforeEach(() => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        sections: { hero: [row('hero', 'Cached Heading')] },
      }));
    });

    it('paints the cached copy on the very first render — no flash of the fallback', () => {
      // Deliberately never resolves: if this assertion passes, the value came
      // from the synchronous cache read and not from the network.
      mockGetAllActive.mockReturnValue(new Promise(() => {}));
      renderProbe();
      expect(screen.getByText('Cached Heading')).toBeInTheDocument();
    });

    it('replaces the cached copy once fresh rows arrive', async () => {
      mockGetAllActive.mockResolvedValue([row('hero', 'Fresh Heading')]);
      renderProbe();
      await waitFor(() => expect(screen.getByText('Fresh Heading')).toBeInTheDocument());
    });

    it('keeps serving the cache when the network fails', async () => {
      mockGetAllActive.mockRejectedValue(new Error('offline'));
      renderProbe();
      await waitFor(() => expect(mockGetAllActive).toHaveBeenCalled());
      expect(screen.getByText('Cached Heading')).toBeInTheDocument();
    });
  });

  describe('unusable cache', () => {
    it('ignores a cache older than the max age', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now() - (25 * 60 * 60 * 1000),
        sections: { hero: [row('hero', 'Ancient Heading')] },
      }));
      mockGetAllActive.mockReturnValue(new Promise(() => {}));
      renderProbe();
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });

    it('ignores corrupt JSON rather than throwing', () => {
      localStorage.setItem(CACHE_KEY, 'not json{');
      mockGetAllActive.mockReturnValue(new Promise(() => {}));
      expect(() => renderProbe()).not.toThrow();
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });
  });

  it('returns an empty array for a section the loaded payload has no rows for', async () => {
    mockGetAllActive.mockResolvedValue([row('closing', 'Something Else')]);
    renderProbe();
    await waitFor(() => expect(screen.getByText('EMPTY')).toBeInTheDocument());
  });

  it('fetches once for the whole tree, however many sections read from it', async () => {
    mockGetAllActive.mockResolvedValue([row('hero', 'H')]);
    render(
      <SiteContentProvider>
        <Probe /><Probe /><Probe />
      </SiteContentProvider>,
    );
    await waitFor(() => expect(mockGetAllActive).toHaveBeenCalledTimes(1));
  });
});
