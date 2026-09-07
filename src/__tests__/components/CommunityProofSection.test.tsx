import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetBySection } = vi.hoisted(() => ({
  mockGetBySection: vi.fn(),
}));

vi.mock('../../../services/api', () => ({
  siteContentApi: { getBySection: mockGetBySection,
  // SiteContentProvider batches every section into one `getAllActive` call.
  // Derive that batch from the per-section fixtures below so each test keeps
  // describing its data section-by-section.
  getAllActive: async () => (
    await Promise.all(['hero','hero_slides','banner','faq','creators','creators_copy','value_cards','value_props_copy','instructors','instructors_copy','testimonial','community_copy','how_it_works','how_it_works_steps','featured_copy','pricing_copy','closing','social_proof','showcase','settings'].map((s: string) => mockGetBySection(s)))
  ).flatMap((r: unknown) => (Array.isArray(r) ? r : [])),
},
}));

vi.mock('../../../utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

vi.mock('../../../hooks/useInViewActive', () => ({
  useInViewActive: () => {},
}));

// AnimatedCounter does DOM-based counting; just render the value + suffix.
vi.mock('../../../components/AnimatedCounter', () => ({
  AnimatedCounter: ({ value, suffix }: { value: number; suffix: string }) =>
    React.createElement('span', null, `${value}${suffix}`),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { CommunityProofSection } from '../../../components/sections/CommunityProofSection';
import { SiteContentProvider } from '../../../context/SiteContentContext';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CMS_TESTIMONIALS = [
  {
    id: 't1',
    section: 'testimonial',
    title: 'CMS Student Name',
    body: 'CMS testimonial quote content here.',
    metadata: { course: 'CMS Course Title', rating: 5 },
    orderIndex: 0,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const CMS_COPY_ROW = {
  id: 'cc1',
  section: 'community_copy',
  title: 'CMS Community Heading',
  body: 'CMS community subheading text.',
  metadata: {
    pill: 'CMS Community Pill',
    verifiedLabel: 'CMS verified label',
    discordEyebrow: 'CMS discord eyebrow',
    discordTitle: 'CMS discord title',
    discordBody: 'CMS discord body text.',
    discordCtaLabel: 'CMS discord cta',
    discordUrl: 'https://discord.gg/cms-test',
    discordFootnote: 'CMS footnote.',
  },
  orderIndex: 0,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

// Hardcoded defaults the component falls back to
const DEFAULT_HEADING = "You won't learn alone.";
const DEFAULT_EYEBROW = 'Real Students. Real Results.';
const DEFAULT_TESTIMONIAL_NAME = 'Rahul M.';
const DEFAULT_DISCORD_TITLE = 'Join the Discord';

// ─── Tests ────────────────────────────────────────────────────────────────────

const renderWithCms = (ui: React.ReactElement) =>
  render(<SiteContentProvider>{ui}</SiteContentProvider>);

describe('CommunityProofSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBySection.mockResolvedValue([]);
  });

  // ── (i) CMS rows present → CMS content renders, defaults absent ─────────────

  describe('when CMS returns testimonials and community_copy', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'testimonial') { return Promise.resolve(CMS_TESTIMONIALS); }
        if (section === 'community_copy') { return Promise.resolve([CMS_COPY_ROW]); }
        return Promise.resolve([]);
      });
    });

    it('renders the CMS testimonial name', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS Student Name')).toBeInTheDocument());
    });

    it('renders the CMS testimonial quote', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(/CMS testimonial quote content here\./)).toBeInTheDocument());
    });

    it('renders the CMS community heading', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS Community Heading')).toBeInTheDocument());
    });

    it('renders the CMS pill', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS Community Pill')).toBeInTheDocument());
    });

    it('renders the CMS discord title', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS discord title')).toBeInTheDocument());
    });

    it('renders the CMS discord CTA label', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS discord cta')).toBeInTheDocument());
    });

    it('renders the CMS discord footnote', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS footnote.')).toBeInTheDocument());
    });

    it('does NOT render the default testimonial name', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS Student Name')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_TESTIMONIAL_NAME)).not.toBeInTheDocument();
    });

    it('does NOT render the hardcoded default heading', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS Community Heading')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_HEADING)).not.toBeInTheDocument();
    });

    it('does NOT render the hardcoded default Discord title', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS discord title')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_DISCORD_TITLE)).not.toBeInTheDocument();
    });
  });

  // ── (ii) CMS returns [] → hardcoded defaults MUST render ────────────────────

  describe('when getBySection resolves [] for all keys (fallback guard)', () => {
    it('renders the hardcoded default heading', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_HEADING)).toBeInTheDocument());
    });

    it('renders the default eyebrow pill', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_EYEBROW)).toBeInTheDocument());
    });

    it('renders the first default testimonial name', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_TESTIMONIAL_NAME)).toBeInTheDocument());
    });

    it('renders the default Discord title', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_DISCORD_TITLE)).toBeInTheDocument());
    });

    it('renders the community stats counters', async () => {
      renderWithCms(<CommunityProofSection />);
      // AnimatedCounter is mocked to render "2500+" etc.
      await waitFor(() => expect(screen.getByText('2500+')).toBeInTheDocument());
    });

    it('renders the default subheading', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() =>
        expect(
          screen.getByText(/A private community of working creators/i),
        ).toBeInTheDocument(),
      );
    });
  });

  // ── (iii) getBySection rejects → defaults render, no throw ──────────────────

  describe('when getBySection rejects', () => {
    beforeEach(() => {
      mockGetBySection.mockRejectedValue(new Error('CMS down'));
    });

    it('renders the default heading when the API rejects', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_HEADING)).toBeInTheDocument());
    });

    it('renders default testimonials when the API rejects', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_TESTIMONIAL_NAME)).toBeInTheDocument());
    });

    it('does not throw when the CMS API rejects', async () => {
      expect(() => renderWithCms(<CommunityProofSection />)).not.toThrow();
      await waitFor(() => expect(screen.getByText(DEFAULT_HEADING)).toBeInTheDocument());
    });
  });

  // ── CMS returns testimonials but NOT copy → copy falls back to defaults ───────

  describe('when CMS returns testimonials but NOT community_copy', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'testimonial') { return Promise.resolve(CMS_TESTIMONIALS); }
        return Promise.resolve([]);
      });
    });

    it('shows CMS testimonial name', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS Student Name')).toBeInTheDocument());
    });

    it('falls back to default heading when copy row is absent', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_HEADING)).toBeInTheDocument());
    });

    it('falls back to default Discord title when copy row is absent', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_DISCORD_TITLE)).toBeInTheDocument());
    });
  });

  // ── CMS returns copy but NOT testimonials → testimonials fall back ────────────

  describe('when CMS returns community_copy but NOT testimonials', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'community_copy') { return Promise.resolve([CMS_COPY_ROW]); }
        return Promise.resolve([]);
      });
    });

    it('shows CMS heading', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText('CMS Community Heading')).toBeInTheDocument());
    });

    it('falls back to default testimonials when CMS testimonials are absent', async () => {
      renderWithCms(<CommunityProofSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_TESTIMONIAL_NAME)).toBeInTheDocument());
    });
  });
});
