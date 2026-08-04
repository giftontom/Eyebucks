import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockApi, mockCheckout, mockNavigate, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getAsset: vi.fn(),
    checkOwnership: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
  mockCheckout: { claimFreeAsset: vi.fn() },
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('../../../services/api', () => ({ digitalAssetsApi: mockApi, checkoutApi: mockCheckout }));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

vi.mock('../../../components', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  Thumbnail: ({ alt }: { alt?: string }) => React.createElement('img', { alt }),
  useToast: () => ({ showToast: mockShowToast, ToastContainer: () => null }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ slug: 'cinematic-luts' }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { AssetDetails } from '../../../pages/AssetDetails';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const asset = {
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

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.getAsset.mockResolvedValue(asset);
  mockApi.checkOwnership.mockResolvedValue(false);
  mockApi.getDownloadUrl.mockResolvedValue({ downloadUrl: 'https://signed/x.zip', expiresAt: 0, filename: 'cinematic-luts.zip' });
  window.open = vi.fn();
});

describe('AssetDetails', () => {
  it('renders the asset title after loading', async () => {
    render(<AssetDetails />);
    await waitFor(() => expect(screen.getByText('Cinematic LUT Pack')).toBeInTheDocument());
  });

  it('shows Buy now and navigates to the asset checkout when not owned', async () => {
    render(<AssetDetails />);
    await waitFor(() => screen.getByRole('button', { name: /buy now/i }));
    fireEvent.click(screen.getByRole('button', { name: /buy now/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/checkout/asset/a1');
  });

  it('claims a free asset without checkout', async () => {
    mockApi.getAsset.mockResolvedValue({ ...asset, price: 0 });
    mockCheckout.claimFreeAsset.mockResolvedValue({ success: true, claimed: true });
    render(<AssetDetails />);
    await waitFor(() => screen.getByRole('button', { name: /get it free/i }));
    fireEvent.click(screen.getByRole('button', { name: /get it free/i }));
    await waitFor(() => expect(mockCheckout.claimFreeAsset).toHaveBeenCalledWith('a1'));
  });

  it('shows Download and calls getDownloadUrl when owned', async () => {
    mockApi.checkOwnership.mockResolvedValue(true);
    render(<AssetDetails />);
    await waitFor(() => screen.getByRole('button', { name: /download/i }));
    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    await waitFor(() => expect(mockApi.getDownloadUrl).toHaveBeenCalledWith('a1'));
    expect(window.open).toHaveBeenCalledWith('https://signed/x.zip', '_blank', 'noopener');
  });

  it('shows a not-found state when the asset is missing', async () => {
    mockApi.getAsset.mockResolvedValue(null);
    render(<AssetDetails />);
    await waitFor(() => expect(screen.getByText('Asset not found')).toBeInTheDocument());
  });

  it('toasts an error when the download fails', async () => {
    mockApi.checkOwnership.mockResolvedValue(true);
    mockApi.getDownloadUrl.mockRejectedValue(new Error('You do not own this asset'));
    render(<AssetDetails />);
    await waitFor(() => screen.getByRole('button', { name: /download/i }));
    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('You do not own this asset', 'error'));
  });
});
