import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi, mockCheckout, mockCoupons, mockNavigate } = vi.hoisted(() => ({
  mockApi: { getAssetById: vi.fn(), checkOwnership: vi.fn() },
  mockCheckout: { createAssetOrder: vi.fn(), verifyAssetPayment: vi.fn() },
  mockCoupons: { applyAssetCoupon: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock('../../../services/api', () => ({ digitalAssetsApi: mockApi, checkoutApi: mockCheckout, couponsApi: mockCoupons }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { name: 'A', email: 'a@b.c', phone_e164: '+910000000000' }, login: vi.fn() }) }));
vi.mock('../../../hooks/useScript', () => ({ useScript: () => true }));
vi.mock('../../../services/supabase', () => ({ supabase: { auth: { refreshSession: vi.fn() } } }));
vi.mock('../../../utils/analytics', () => ({ analytics: { track: vi.fn() } }));
vi.mock('../../../components', () => ({
  Button: ({ children, onClick, disabled }: { children?: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    React.createElement('button', { onClick, disabled }, children),
  Thumbnail: ({ alt }: { alt?: string }) => React.createElement('img', { alt }),
  TrustBadges: () => null,
}));
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'a1' }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children),
}));

import { AssetCheckout } from '../../../pages/AssetCheckout';

const paidAsset = {
  id: 'a1', slug: 'cinematic-luts', title: 'Cinematic LUT Pack', description: 'd', price: 49900, comparePrice: null,
  fileType: 'LUT', license: 'PERSONAL', fileSize: 1024, fileExt: 'zip', thumbnail: '', previewUrl: null,
  version: 'v1', status: 'PUBLISHED', downloadCount: 0, createdAt: new Date('2026-06-01'), updatedAt: new Date('2026-06-01'),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.getAssetById.mockResolvedValue(paidAsset);
  mockApi.checkOwnership.mockResolvedValue(false);
});

describe('AssetCheckout', () => {
  it('renders the asset and a Pay button when not owned', async () => {
    render(<AssetCheckout />);
    await waitFor(() => expect(screen.getByText('Cinematic LUT Pack')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /pay/i })).toBeInTheDocument();
  });

  it('shows the already-owned state with a download link', async () => {
    mockApi.checkOwnership.mockResolvedValue(true);
    render(<AssetCheckout />);
    await waitFor(() => expect(screen.getByText('You already own this asset')).toBeInTheDocument());
    expect(screen.getByText(/go to download/i)).toBeInTheDocument();
  });

  it('shows a not-found state when the asset is missing', async () => {
    mockApi.getAssetById.mockResolvedValue(null);
    render(<AssetCheckout />);
    await waitFor(() => expect(screen.getByText('Asset not found')).toBeInTheDocument());
  });

  it('redirects free assets to the detail page', async () => {
    mockApi.getAssetById.mockResolvedValue({ ...paidAsset, price: 0 });
    render(<AssetCheckout />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/asset/cinematic-luts', { replace: true }));
  });

  it('applies a coupon and shows the discount', async () => {
    mockCoupons.applyAssetCoupon.mockResolvedValue({ couponUseId: 'cu1', discountPct: 20 });
    render(<AssetCheckout />);
    await waitFor(() => screen.getByLabelText('Coupon code'));
    fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'SAVE20' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() => expect(mockCoupons.applyAssetCoupon).toHaveBeenCalledWith('SAVE20', 'a1'));
    await waitFor(() => expect(screen.getByText(/20% off applied/i)).toBeInTheDocument());
  });
});
