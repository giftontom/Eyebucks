import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: { getOwnedAssets: vi.fn(), getDownloadUrl: vi.fn() },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../services/api', () => ({ digitalAssetsApi: mockApi }));
vi.mock('../../../components/Thumbnail', () => ({ Thumbnail: ({ alt }: { alt?: string }) => React.createElement('img', { alt }) }));
vi.mock('../../../components/Toast', () => ({ useToast: () => ({ showToast: mockShowToast, ToastContainer: () => null }) }));
vi.mock('react-router-dom', () => ({ Link: ({ children, to }: { children?: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children) }));

import { OwnedAssetsTab } from '../../../components/OwnedAssetsTab';

const owned = [{
  id: 'p1',
  userId: 'u1',
  assetId: 'a1',
  status: 'ACTIVE',
  paymentId: 'pay1',
  orderId: 'o1',
  amount: 49900,
  downloadCount: 0,
  lastDownloadedAt: null,
  purchasedAt: new Date('2026-06-01'),
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
  asset: {
    id: 'a1', slug: 'cinematic-luts', title: 'Cinematic LUT Pack', description: 'd', price: 49900, comparePrice: null,
    fileType: 'LUT', license: 'PERSONAL', fileSize: 1024, fileExt: 'zip', thumbnail: '', previewUrl: null,
    version: 'v1', status: 'PUBLISHED', downloadCount: 0, createdAt: new Date('2026-06-01'), updatedAt: new Date('2026-06-01'),
  },
}];

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.getOwnedAssets.mockResolvedValue(owned);
  mockApi.getDownloadUrl.mockResolvedValue({ downloadUrl: 'https://signed/x.zip', expiresAt: 0, filename: 'cinematic-luts.zip' });
  window.open = vi.fn();
});

describe('OwnedAssetsTab', () => {
  it('renders owned assets', async () => {
    render(<OwnedAssetsTab />);
    await waitFor(() => expect(screen.getByText('Cinematic LUT Pack')).toBeInTheDocument());
  });

  it('shows empty state when nothing owned', async () => {
    mockApi.getOwnedAssets.mockResolvedValue([]);
    render(<OwnedAssetsTab />);
    await waitFor(() => expect(screen.getByText('No assets yet')).toBeInTheDocument());
  });

  it('downloads via signed URL on click', async () => {
    render(<OwnedAssetsTab />);
    await waitFor(() => screen.getByRole('button', { name: /download/i }));
    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    await waitFor(() => expect(mockApi.getDownloadUrl).toHaveBeenCalledWith('a1'));
    expect(window.open).toHaveBeenCalledWith('https://signed/x.zip', '_blank', 'noopener');
  });

  it('toasts on download failure', async () => {
    mockApi.getDownloadUrl.mockRejectedValue(new Error('You do not own this asset'));
    render(<OwnedAssetsTab />);
    await waitFor(() => screen.getByRole('button', { name: /download/i }));
    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('You do not own this asset', 'error'));
  });
});
