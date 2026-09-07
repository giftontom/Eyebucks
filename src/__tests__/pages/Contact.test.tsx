import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Contact } from '../../../pages/Contact';
import { useSiteSection } from '../../../context/SiteContentContext';

vi.mock('../../../context/SiteContentContext', () => ({
  useSiteSection: vi.fn(() => null),
}));

const asMock = useSiteSection as unknown as ReturnType<typeof vi.fn>;

describe('Contact', () => {
  beforeEach(() => asMock.mockReturnValue(null));

  it('renders page heading', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('shows email support link (fallback)', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByText('support@eyebuckz.com')).toBeInTheDocument();
  });

  it('shows FAQ section', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByText('Frequently Asked')).toBeInTheDocument();
  });

  it('renders CMS overrides for heading, email and support bullets', () => {
    asMock.mockReturnValue([{
      id: 'c1', section: 'contact_copy', title: 'Talk To Us', body: 'We reply fast.',
      metadata: {
        eyebrow: 'Say Hi',
        email: 'help@eyebuckz.com',
        emailNote: 'Billing and access.',
        youtubeUrl: 'https://youtube.com/@custom',
        faqItems: ['Refunds: within 14 days.'],
      },
      orderIndex: 0, isActive: true,
    }]);
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByText('Talk To Us')).toBeInTheDocument();
    expect(screen.getByText('help@eyebuckz.com')).toBeInTheDocument();
    // The label before the first colon is bolded and the rest is shown.
    expect(screen.getByText('Refunds:')).toBeInTheDocument();
    expect(screen.getByText(/within 14 days\./)).toBeInTheDocument();
    // The email card links to the CMS address.
    const emailLink = screen.getByText('help@eyebuckz.com').closest('a') as HTMLAnchorElement;
    expect(emailLink.getAttribute('href')).toBe('mailto:help@eyebuckz.com');
    // The old default address is gone.
    expect(screen.queryByText('support@eyebuckz.com')).not.toBeInTheDocument();
  });
});
