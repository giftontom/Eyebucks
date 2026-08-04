import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetBySection } = vi.hoisted(() => ({
  mockGetBySection: vi.fn(),
}));

// Mock the whole services/api barrel so `siteContentApi.getBySection` resolves
// from our mock regardless of which key is requested.
vi.mock('../../../services/api', () => ({
  siteContentApi: { getBySection: mockGetBySection },
  // Barrel re-exports used by HorizontalGallery / FadeIn via their own files
  // are only needed at runtime — the import paths in the component go through
  // the barrel, so mocking it here is sufficient.
}));

// Silence logger noise
vi.mock('../../../utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// usePrefersReducedMotion: return false (full animations path) so FadeIn
// starts visible (IntersectionObserver mock is in setup.ts, noObserver=false
// but IO.observe is a no-op — so FadeIn falls to the noObserver visible path).
vi.mock('../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

// useInViewActive is a DOM-mutation hook — no-op it so HorizontalGallery mounts cleanly.
vi.mock('../../../hooks/useInViewActive', () => ({
  useInViewActive: () => {},
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { ValuePropsSection } from '../../../components/sections/ValuePropsSection';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CMS_VALUE_CARDS = [
  {
    id: 'vc1',
    section: 'value_cards',
    title: 'CMS Card One',
    body: 'CMS description one',
    metadata: { icon: 'award', bullets: ['Bullet A', 'Bullet B'] },
    orderIndex: 0,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const CMS_COPY_ROW = {
  id: 'vpc1',
  section: 'value_props_copy',
  title: 'CMS Why We Are Special',
  body: 'CMS subtitle text.',
  metadata: { pill: 'CMS Pill', footerLinkLabel: 'CMS browse link' },
  orderIndex: 0,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

// Default strings the component hard-codes (regression guards)
const DEFAULT_TITLE = 'Built for creators who mean it.';
const DEFAULT_PILL = 'Why Eyebuckz';
const DEFAULT_CARD_TITLE = 'Practical Learning';

function renderSection() {
  return render(
    <MemoryRouter>
      <ValuePropsSection />
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ValuePropsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: both CMS calls return nothing → fallback to hardcoded defaults.
    mockGetBySection.mockResolvedValue([]);
  });

  // ── (i) CMS rows present → CMS content renders, defaults absent ─────────────

  describe('when CMS returns cards and copy', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'value_cards') { return Promise.resolve(CMS_VALUE_CARDS); }
        if (section === 'value_props_copy') { return Promise.resolve([CMS_COPY_ROW]); }
        return Promise.resolve([]);
      });
    });

    it('renders the CMS card title', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS Card One')).toBeInTheDocument());
    });

    it('renders the CMS card body', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS description one')).toBeInTheDocument());
    });

    it('renders the CMS heading from copy row', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS Why We Are Special')).toBeInTheDocument());
    });

    it('renders the CMS pill from metadata', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS Pill')).toBeInTheDocument());
    });

    it('renders the CMS footer link label from metadata', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS browse link')).toBeInTheDocument());
    });

    it('does NOT render the hardcoded default card title', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS Card One')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_CARD_TITLE)).not.toBeInTheDocument();
    });

    it('does NOT render the hardcoded default heading', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS Why We Are Special')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_TITLE)).not.toBeInTheDocument();
    });

    it('does NOT render the hardcoded default pill', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS Pill')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_PILL)).not.toBeInTheDocument();
    });
  });

  // ── (ii) CMS returns [] → hardcoded defaults MUST render ────────────────────

  describe('when getBySection resolves [] for all keys (fallback guard)', () => {
    it('renders the hardcoded default card title', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText(DEFAULT_CARD_TITLE)).toBeInTheDocument());
    });

    it('renders all three default cards', async () => {
      renderSection();
      await waitFor(() => {
        expect(screen.getByText('Practical Learning')).toBeInTheDocument();
        expect(screen.getByText('Industry Experts')).toBeInTheDocument();
        expect(screen.getByText('Creator Toolkit')).toBeInTheDocument();
      });
    });

    it('renders the default heading', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument());
    });

    it('renders the default pill', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText(DEFAULT_PILL)).toBeInTheDocument());
    });

    it('renders the default footer link label', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('Browse the full catalog')).toBeInTheDocument());
    });
  });

  // ── (iii) getBySection rejects → defaults render, no throw ──────────────────

  describe('when getBySection rejects', () => {
    beforeEach(() => {
      mockGetBySection.mockRejectedValue(new Error('CMS offline'));
    });

    it('renders the hardcoded default card titles when API rejects', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText(DEFAULT_CARD_TITLE)).toBeInTheDocument());
    });

    it('renders the hardcoded default heading when API rejects', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument());
    });

    it('does not throw when the CMS API rejects', async () => {
      expect(() => renderSection()).not.toThrow();
      // Give effects time to settle
      await waitFor(() => expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument());
    });
  });

  // ── CMS provides cards but NOT copy → copy falls back to defaults ────────────

  describe('when CMS returns cards but NOT copy', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'value_cards') { return Promise.resolve(CMS_VALUE_CARDS); }
        return Promise.resolve([]); // no copy row
      });
    });

    it('shows CMS card title', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS Card One')).toBeInTheDocument());
    });

    it('falls back to default heading when copy row is absent', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument());
    });
  });

  // ── CMS provides copy but NOT cards → cards fall back to defaults ────────────

  describe('when CMS returns copy but NOT cards', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'value_props_copy') { return Promise.resolve([CMS_COPY_ROW]); }
        return Promise.resolve([]); // no cards
      });
    });

    it('shows CMS heading', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText('CMS Why We Are Special')).toBeInTheDocument());
    });

    it('falls back to default cards when CMS cards are absent', async () => {
      renderSection();
      await waitFor(() => expect(screen.getByText(DEFAULT_CARD_TITLE)).toBeInTheDocument());
    });
  });
});
