import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { AssetCard } from '../../../components/AssetCard';

import type { DigitalAsset } from '../../../types';

const baseAsset: DigitalAsset = {
  id: 'a1',
  slug: 'cinematic-luts',
  title: 'Cinematic LUT Pack',
  description: 'Twelve film-grade LUTs.',
  price: 49900,
  comparePrice: 79900,
  fileType: 'LUT',
  license: 'PERSONAL',
  fileSize: 1024,
  fileExt: 'zip',
  thumbnail: '',
  previewUrl: null,
  version: 'v1',
  status: 'PUBLISHED',
  downloadCount: 12,
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
};

const renderCard = (asset: DigitalAsset = baseAsset) =>
  render(
    <MemoryRouter>
      <AssetCard asset={asset} index={0} disableReveal />
    </MemoryRouter>,
  );

describe('AssetCard', () => {
  it('renders the title and links to the asset detail page', () => {
    renderCard();
    expect(screen.getByText('Cinematic LUT Pack')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.some(l => l.getAttribute('href') === '/asset/cinematic-luts')).toBe(true);
  });

  it('shows "Free" for a zero-price asset', () => {
    renderCard({ ...baseAsset, price: 0, comparePrice: null });
    // "Free" appears both as a badge and as the price.
    expect(screen.getAllByText('Free').length).toBeGreaterThan(0);
  });

  it('does not show "Free" for a paid asset', () => {
    renderCard();
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
  });
});
