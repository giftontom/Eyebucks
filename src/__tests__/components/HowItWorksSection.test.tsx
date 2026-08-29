import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Reduced motion → the plain tap-through render path (no pin/scroll-jack), so
// the tests exercise the step data rather than the scroll driver.
vi.mock('../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => true,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { HowItWorksSection } from '../../../components/sections/HowItWorksSection';
import { SiteContentProvider } from '../../../context/SiteContentContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const row = (id: string, section: string, title: string, body: string, metadata: Record<string, unknown> = {}) => ({
  id,
  section,
  title,
  body,
  metadata,
  orderIndex: 0,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
});

const CMS_STEPS = [
  row('s1', 'how_it_works_steps', 'Pick a Track', 'Choose the path that matches your goal.', { icon: 'search' }),
  row('s2', 'how_it_works_steps', 'Shoot Weekly', 'Ship one edit every week with feedback.', { icon: 'video' }),
];

const CMS_HEADER = row('h1', 'how_it_works', 'Your Path to Top Influencer', 'CMS subheading.', { pill: 'CMS Pill' });

// Strings the component hard-codes (regression guards)
const DEFAULT_STEP_TITLE = 'Browse Courses';
const DEFAULT_STEP_BODY = 'Explore our catalog of filmmaking courses — from cinematography basics to advanced color grading. Every course includes real project files and RAW footage.';
const DEFAULT_HEADING = 'Your Path to Pro Filmmaker.';

// ─── Tests ────────────────────────────────────────────────────────────────────

const renderWithCms = (ui: React.ReactElement) =>
  render(<SiteContentProvider>{ui}</SiteContentProvider>);

describe('HowItWorksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBySection.mockResolvedValue([]);
  });

  // ── CMS rows present → CMS steps render, hardcoded steps absent ─────────────

  describe('when the CMS has how_it_works_steps rows', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'how_it_works_steps') { return Promise.resolve(CMS_STEPS); }
        if (section === 'how_it_works') { return Promise.resolve([CMS_HEADER]); }
        return Promise.resolve([]);
      });
    });

    it('renders the first CMS step title', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getByText('Pick a Track')).toBeInTheDocument());
    });

    it('renders the first CMS step description', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() =>
        expect(screen.getByText('Choose the path that matches your goal.')).toBeInTheDocument(),
      );
    });

    it('renders one rail tab per CMS step', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2));
    });

    it('derives the step counter from the CMS row count', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getByText('Step 01 / 02')).toBeInTheDocument());
    });

    it('does NOT render the hardcoded default step', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getByText('Pick a Track')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_STEP_TITLE)).not.toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_STEP_BODY)).not.toBeInTheDocument();
    });

    it('shows the second CMS step after clicking its rail tab', async () => {
      const user = userEvent.setup();
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2));
      await user.click(screen.getByRole('tab', { name: 'Step 02: Shoot Weekly' }));
      expect(screen.getByText('Ship one edit every week with feedback.')).toBeInTheDocument();
      expect(screen.getByText('Step 02 / 02')).toBeInTheDocument();
    });

    it('still applies the header copy row', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getByText('Your Path to Top Influencer')).toBeInTheDocument());
      expect(screen.getByText('CMS Pill')).toBeInTheDocument();
    });
  });

  // ── CMS empty → hardcoded steps MUST render unchanged ───────────────────────

  describe('when how_it_works_steps is empty (fallback guard)', () => {
    it('renders the hardcoded first step', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_STEP_TITLE)).toBeInTheDocument());
      expect(screen.getByText(DEFAULT_STEP_BODY)).toBeInTheDocument();
    });

    it('renders three rail tabs', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(3));
    });

    it('renders the "/ 03" counter', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getByText('Step 01 / 03')).toBeInTheDocument());
    });

    it('renders the default heading', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_HEADING)).toBeInTheDocument());
    });
  });

  // ── getBySection rejects → defaults render, no throw ────────────────────────

  describe('when getBySection rejects', () => {
    beforeEach(() => {
      mockGetBySection.mockRejectedValue(new Error('CMS offline'));
    });

    it('falls back to the hardcoded steps without throwing', async () => {
      expect(() => renderWithCms(<HowItWorksSection />)).not.toThrow();
      await waitFor(() => expect(screen.getByText(DEFAULT_STEP_TITLE)).toBeInTheDocument());
      expect(screen.getByText(DEFAULT_HEADING)).toBeInTheDocument();
    });
  });

  // ── Unknown icon key must not crash the render ──────────────────────────────

  describe('when a step row carries an unknown icon key', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) =>
        section === 'how_it_works_steps'
          ? Promise.resolve([row('s1', 'how_it_works_steps', 'Odd Icon', 'Body copy.', { icon: 'not-a-real-icon' })])
          : Promise.resolve([]),
      );
    });

    it('renders the step with the fallback icon', async () => {
      renderWithCms(<HowItWorksSection />);
      await waitFor(() => expect(screen.getByText('Odd Icon')).toBeInTheDocument());
      expect(screen.getByText('Step 01 / 01')).toBeInTheDocument();
    });
  });
});
