import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getAdminAssets: vi.fn(),
    publishAsset: vi.fn(),
    deleteAsset: vi.fn(),
    restoreAsset: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../../services/api/digitalAssets.api', () => ({ digitalAssetsApi: mockApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({ showToast: mockShowToast }),
}));

vi.mock('../../../../pages/admin/hooks/useAdminData', () => ({
  useAdminData: ({ fetchFn }: { fetchFn: () => Promise<any> }) => {
    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
      fetchFn().then((d: any) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);
    return { data, loading, refetch: vi.fn() };
  },
}));

vi.mock('../../../../pages/admin/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title, confirmLabel = 'Confirm' }: any) =>
    open
      ? React.createElement('div', { role: 'dialog', 'aria-label': title },
          React.createElement('button', { onClick: onConfirm }, confirmLabel)
        )
      : null,
}));

vi.mock('../../../../pages/admin/components/DataTable', () => ({
  DataTable: ({ data, loading, emptyMessage, loadingMessage, columns }: any) => {
    if (loading) { return React.createElement('div', null, loadingMessage || 'Loading...'); }
    if (!data || data.length === 0) { return React.createElement('div', null, emptyMessage); }
    return React.createElement(
      'table', null,
      React.createElement('tbody', null,
        data.map((row: any) =>
          React.createElement('tr', { key: row.id },
            columns.map((col: any) =>
              React.createElement('td', { key: col.key }, col.render ? col.render(row) : row[col.key])
            )
          )
        )
      )
    );
  },
}));

vi.mock('../../../../pages/admin/components/StatusBadge', () => ({
  StatusBadge: ({ status }: any) => React.createElement('span', null, status),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { DigitalAssetsPage } from '../../../../pages/admin/DigitalAssetsPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockAsset = {
  id: 'a1',
  slug: 'cinematic-luts',
  title: 'Cinematic LUT Pack',
  description: 'desc',
  price: 49900,
  comparePrice: null,
  fileType: 'LUT',
  license: 'PERSONAL',
  fileSize: 1024,
  fileExt: 'zip',
  thumbnail: '',
  previewUrl: null,
  version: 'v1',
  status: 'PUBLISHED',
  downloadCount: 5,
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
  deletedAt: null,
};

const mockArchivedAsset = {
  ...mockAsset,
  id: 'a2',
  title: 'Old Preset Pack',
  status: 'DRAFT',
  deletedAt: '2026-01-01T00:00:00Z',
};

const renderPage = () => render(<DigitalAssetsPage />);

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.getAdminAssets.mockResolvedValue([mockAsset]);
  mockApi.publishAsset.mockResolvedValue(undefined);
  mockApi.deleteAsset.mockResolvedValue(undefined);
  mockApi.restoreAsset.mockResolvedValue(undefined);
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DigitalAssetsPage', () => {
  it('renders asset title after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Cinematic LUT Pack')).toBeInTheDocument());
  });

  it('shows empty message when there are no assets', async () => {
    mockApi.getAdminAssets.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText('No digital assets found')).toBeInTheDocument());
  });

  it('calls publishAsset with DRAFT and toasts success when Unpublish is confirmed', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cinematic LUT Pack'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Unpublish' })[0]); // opens dialog
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Unpublish' }).length).toBe(2));
    fireEvent.click(screen.getAllByRole('button', { name: 'Unpublish' })[1]); // confirm
    await waitFor(() => expect(mockApi.publishAsset).toHaveBeenCalledWith('a1', 'DRAFT'));
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('successfully'), 'success');
  });

  it('archives an asset on confirm', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cinematic LUT Pack'));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive Asset' }));
    await waitFor(() => expect(mockApi.deleteAsset).toHaveBeenCalledWith('a1'));
    expect(mockShowToast).toHaveBeenCalledWith('Asset archived!', 'success');
  });

  it('restores an archived asset on confirm', async () => {
    mockApi.getAdminAssets.mockResolvedValue([mockAsset, mockArchivedAsset]);
    renderPage();
    await waitFor(() => screen.getByText('Cinematic LUT Pack'));
    fireEvent.click(screen.getByRole('button', { name: /show archived/i }));
    await waitFor(() => expect(screen.getByText('Old Preset Pack')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Restore' }).length).toBeGreaterThan(1));
    fireEvent.click(screen.getAllByRole('button', { name: 'Restore' }).slice(-1)[0]);
    await waitFor(() => expect(mockApi.restoreAsset).toHaveBeenCalledWith('a2'));
    expect(mockShowToast).toHaveBeenCalledWith('Asset restored!', 'success');
  });

  it('shows error toast when publish fails', async () => {
    mockApi.publishAsset.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => screen.getByText('Cinematic LUT Pack'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Unpublish' })[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Unpublish' }).length).toBe(2));
    fireEvent.click(screen.getAllByRole('button', { name: 'Unpublish' })[1]);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Network error', 'error'));
  });

  it('renders Free for a zero-price asset', async () => {
    mockApi.getAdminAssets.mockResolvedValue([{ ...mockAsset, price: 0 }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Free')).toBeInTheDocument());
  });
});
