import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { About } from '../../../pages/About';
import { useSiteSection } from '../../../context/SiteContentContext';

vi.mock('../../../context/SiteContentContext', () => ({
  useSiteSection: vi.fn(() => null),
}));

const asMock = useSiteSection as unknown as ReturnType<typeof vi.fn>;

describe('About', () => {
  beforeEach(() => {
    asMock.mockReturnValue(null);
  });

  it('renders page heading', () => {
    render(<MemoryRouter><About /></MemoryRouter>);
    expect(screen.getByText('About Eyebuckz')).toBeInTheDocument();
  });

  it('renders mission description', () => {
    render(<MemoryRouter><About /></MemoryRouter>);
    expect(screen.getByText(/filmmaker-built learning platform/i)).toBeInTheDocument();
  });

  // ── CMS-editable cards + offer list ──────────────────────────────────────
  it('falls back to built-in cards and offer bullets when the section is empty', () => {
    render(<MemoryRouter><About /></MemoryRouter>);
    expect(screen.getByText('Practical Learning')).toBeInTheDocument();
    expect(screen.getByText(/100GB\+ of 6K RAW footage/)).toBeInTheDocument();
  });

  it('renders overridden card copy and offer bullets from about_page metadata', () => {
    asMock.mockReturnValue([{
      id: 'a1', section: 'about_page', title: 'About Us', body: 'Intro.',
      metadata: {
        card1Title: 'Hands-on Craft', card1Body: 'Real footage.',
        card2Title: '25,000+ Creators', card2Body: 'Bigger community.',
        card3Title: 'Verified Certs', card3Body: 'Add to LinkedIn.',
        offerItems: ['Custom bullet one', 'Custom bullet two'],
      },
      orderIndex: 0, isActive: true,
    }]);
    render(<MemoryRouter><About /></MemoryRouter>);
    expect(screen.getByText('Hands-on Craft')).toBeInTheDocument();
    expect(screen.getByText('25,000+ Creators')).toBeInTheDocument();
    expect(screen.getByText('Custom bullet one')).toBeInTheDocument();
    // Built-in bullets must be gone once the CMS provides its own list.
    expect(screen.queryByText(/100GB\+ of 6K RAW footage/)).not.toBeInTheDocument();
  });

  it('ignores blank offer bullets rather than rendering empty list items', () => {
    asMock.mockReturnValue([{
      id: 'a1', section: 'about_page', title: 'About Us', body: 'Intro.',
      metadata: { offerItems: ['Only real bullet', '   ', ''] },
      orderIndex: 0, isActive: true,
    }]);
    const { container } = render(<MemoryRouter><About /></MemoryRouter>);
    const offerList = [...container.querySelectorAll('ul')].pop();
    expect(offerList?.querySelectorAll('li').length).toBe(1);
  });
});
