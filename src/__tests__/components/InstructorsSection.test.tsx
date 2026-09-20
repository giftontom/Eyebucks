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

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { InstructorsSection } from '../../../components/sections/InstructorsSection';
import { SiteContentProvider } from '../../../context/SiteContentContext';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CMS_INSTRUCTORS = [
  {
    id: 'inst1',
    section: 'instructors',
    title: 'CMS Instructor One',
    body: 'Expert in cinematography for 15 years.',
    metadata: { role: 'Director of Photography', photo: '/photos/inst1.jpg' },
    orderIndex: 0,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const CMS_COPY_ROW = {
  id: 'instcopy1',
  section: 'instructors_copy',
  title: 'CMS Instructors Heading',
  body: 'CMS instructors subheading text.',
  metadata: { pill: 'CMS Instructor Pill' },
  orderIndex: 0,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

// Hardcoded defaults the component falls back to
const DEFAULT_INSTRUCTOR_NAME = 'Shahul Ameen';
const DEFAULT_TITLE = 'Learn From Working Pros.';
const DEFAULT_PILL = 'Meet Your Instructors';

// ─── Tests ────────────────────────────────────────────────────────────────────

const renderWithCms = (ui: React.ReactElement) =>
  render(<SiteContentProvider>{ui}</SiteContentProvider>);

describe('InstructorsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBySection.mockResolvedValue([]);
  });

  // ── (i) CMS rows present → CMS content renders, defaults absent ─────────────

  describe('when CMS returns instructors and copy', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'instructors') { return Promise.resolve(CMS_INSTRUCTORS); }
        if (section === 'instructors_copy') { return Promise.resolve([CMS_COPY_ROW]); }
        return Promise.resolve([]);
      });
    });

    it('renders the CMS instructor name', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('CMS Instructor One')).toBeInTheDocument());
    });

    it('renders the CMS instructor bio', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('Expert in cinematography for 15 years.')).toBeInTheDocument());
    });

    it('renders the CMS instructor role from metadata', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('Director of Photography')).toBeInTheDocument());
    });

    it('renders the CMS heading from copy row', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('CMS Instructors Heading')).toBeInTheDocument());
    });

    it('renders the CMS pill from copy metadata', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('CMS Instructor Pill')).toBeInTheDocument());
    });

    it('does NOT render the default instructor name', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('CMS Instructor One')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_INSTRUCTOR_NAME)).not.toBeInTheDocument();
    });

    it('does NOT render the hardcoded default heading', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('CMS Instructors Heading')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_TITLE)).not.toBeInTheDocument();
    });

    it('does NOT render the hardcoded default pill', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('CMS Instructor Pill')).toBeInTheDocument());
      expect(screen.queryByText(DEFAULT_PILL)).not.toBeInTheDocument();
    });
  });

  // ── (ii) CMS returns [] → hardcoded defaults MUST render ────────────────────

  describe('when getBySection resolves [] for all keys (fallback guard)', () => {
    it('renders both default instructor names', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => {
        expect(screen.getByText('Shahul Ameen')).toBeInTheDocument();
        expect(screen.getByText('Shabeeb')).toBeInTheDocument();
      });
    });

    it('renders the default heading', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument());
    });

    it('renders the default pill', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_PILL)).toBeInTheDocument());
    });

    it('renders the default bio snippet for Shahul', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() =>
        expect(screen.getByText(/Specialist in DaVinci Resolve/i)).toBeInTheDocument(),
      );
    });
  });

  // ── (iii) getBySection rejects → defaults render, no throw ──────────────────

  describe('when getBySection rejects', () => {
    beforeEach(() => {
      mockGetBySection.mockRejectedValue(new Error('CMS unreachable'));
    });

    it('renders the default instructor names when the API rejects', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_INSTRUCTOR_NAME)).toBeInTheDocument());
    });

    it('renders the default heading when the API rejects', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument());
    });

    it('does not throw when the CMS API rejects', async () => {
      expect(() => renderWithCms(<InstructorsSection />)).not.toThrow();
      await waitFor(() => expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument());
    });
  });

  // ── CMS returns instructors but NOT copy → copy defaults ────────────────────

  describe('when CMS returns instructors but NOT copy', () => {
    beforeEach(() => {
      mockGetBySection.mockImplementation((section: string) => {
        if (section === 'instructors') { return Promise.resolve(CMS_INSTRUCTORS); }
        return Promise.resolve([]);
      });
    });

    it('shows CMS instructor name', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText('CMS Instructor One')).toBeInTheDocument());
    });

    it('falls back to default heading when copy row is absent', async () => {
      renderWithCms(<InstructorsSection />);
      await waitFor(() => expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument());
    });
  });
});
