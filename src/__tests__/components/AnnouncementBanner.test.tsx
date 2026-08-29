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
});
