import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetBySection = vi.fn();

vi.mock('../../../services/api/siteContent.api', () => ({
  siteContentApi: {
    getBySection: (...args: any[]) => mockGetBySection(...args),
    // SiteContentProvider batches every section into one `getAllActive` call.
    getAllActive: async () => {
      const rows = await mockGetBySection('banner');
      // Fixtures below omit `section`; the provider groups rows by it.
      return Array.isArray(rows) ? rows.map((r: any) => ({ ...r, section: 'banner' })) : [];
    },
  },
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn() },
}));

import { AnnouncementBanner } from '../../../components/AnnouncementBanner';
import { SiteContentProvider } from '../../../context/SiteContentContext';

const renderWithCms = (ui: React.ReactElement) =>
  render(<SiteContentProvider>{ui}</SiteContentProvider>);

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders banner title from CMS', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: 'New course available!', body: 'Check it out', metadata: {} },
    ]);

    renderWithCms(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.getByText('New course available!')).toBeInTheDocument();
    });
  });

  it('renders nothing when no banners exist', async () => {
    mockGetBySection.mockResolvedValue([]);
    const { container } = renderWithCms(<AnnouncementBanner />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('dismisses banner and saves to localStorage', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: 'Sale!', body: '', metadata: { dismissible: true } },
    ]);

    renderWithCms(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.getByText('Sale!')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Dismiss banner'));
    expect(screen.queryByText('Sale!')).not.toBeInTheDocument();
    const dismissedIds = JSON.parse(localStorage.getItem('eyebuckz_banner_dismissed_ids') || '[]');
    expect(dismissedIds).toContain('b1');
  });

  /**
   * Reported as "the announcement section is showing only space" on the home
   * page. An active row whose title had been cleared still rendered the band —
   * padding and a background colour wrapping no text — so the page showed a
   * blank stripe with nothing in it.
   */
  it('renders nothing when the only banner row has no text', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: '   ', body: '', metadata: { bgColor: '#111' } },
    ]);

    const { container } = renderWithCms(<AnnouncementBanner />);
    await waitFor(() => expect(mockGetBySection).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('skips an empty row to show a real announcement behind it', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: '', body: '', metadata: {} },
      { id: 'b2', title: 'New cohort starting soon', body: '', metadata: {} },
    ]);

    renderWithCms(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.getByText('New cohort starting soon')).toBeInTheDocument();
    });
  });

  it('still shows a row that has body text but no title', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: '', body: 'Free shipping this week', metadata: {} },
    ]);

    renderWithCms(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.getByText('Free shipping this week')).toBeInTheDocument();
    });
  });

  /**
   * Reported as "the banner gap is showing at the top even though the banner is
   * not there." The row had bgColor #003366 and textColor #003376 — two
   * near-identical dark blues — so the message was invisible on its own
   * background and looked like an empty coloured strip.
   */
  it('forces a readable text colour when text and background are too similar', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: 'New Courses Launching Soon', body: '', metadata: { bgColor: '#003366', textColor: '#003376' } },
    ]);
    renderWithCms(<AnnouncementBanner />);
    const label = await screen.findByText('New Courses Launching Soon');
    const banner = label.closest('div[style]') as HTMLElement;
    expect(banner.style.backgroundColor).toBe('rgb(0, 51, 102)');
    // Not the near-invisible #003376 — forced to white on the dark background.
    expect(banner.style.color).toBe('rgb(255, 255, 255)');
  });

  it('keeps an explicitly readable text colour as chosen', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: 'Readable banner', body: '', metadata: { bgColor: '#ffffff', textColor: '#111111' } },
    ]);
    renderWithCms(<AnnouncementBanner />);
    const label = await screen.findByText('Readable banner');
    const banner = label.closest('div[style]') as HTMLElement;
    expect(banner.style.color).toBe('rgb(17, 17, 17)');
  });
});
