import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetBySection = vi.fn();

vi.mock('../../../services/api/siteContent.api', () => ({
  siteContentApi: { getBySection: (...args: any[]) => mockGetBySection(...args) },
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn() },
}));

import { AnnouncementBanner } from '../../../components/AnnouncementBanner';

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders banner title from CMS', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: 'New course available!', body: 'Check it out', metadata: {} },
    ]);

    render(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.getByText('New course available!')).toBeInTheDocument();
    });
  });

  it('renders nothing when no banners exist', async () => {
    mockGetBySection.mockResolvedValue([]);
    const { container } = render(<AnnouncementBanner />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('dismisses banner and saves to localStorage', async () => {
    mockGetBySection.mockResolvedValue([
      { id: 'b1', title: 'Sale!', body: '', metadata: { dismissible: true } },
    ]);

    render(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.getByText('Sale!')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Dismiss banner'));
    expect(screen.queryByText('Sale!')).not.toBeInTheDocument();
    const dismissedIds = JSON.parse(localStorage.getItem('eyebuckz_banner_dismissed_ids') || '[]');
    expect(dismissedIds).toContain('b1');
  });
});
