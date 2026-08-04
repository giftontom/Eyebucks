import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockApi, mockShowToast, mockNavigate } = vi.hoisted(() => ({
  mockApi: {
    getAdminAsset: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
  },
  mockShowToast: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('../../../../services/api/digitalAssets.api', () => ({ digitalAssetsApi: mockApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({ showToast: mockShowToast }),
}));

// Stub the heavy widgets: ImageUpload is inert; AssetUploader exposes a button that
// simulates a completed in-app upload.
vi.mock('../../../../components/ImageUpload', () => ({
  ImageUpload: () => React.createElement('div', null, 'image-upload'),
}));
vi.mock('../../../../components/AssetUploader', () => ({
  AssetUploader: ({ onUploadComplete }: { onUploadComplete: (d: { path: string; fileExt: string; fileSize: number; filename: string }) => void }) =>
    React.createElement(
      'button',
      { onClick: () => onUploadComplete({ path: 'assets/x.zip', fileExt: 'zip', fileSize: 123, filename: 'x.zip' }) },
      'mock-upload',
    ),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({}), // create mode
  useNavigate: () => mockNavigate,
  Link: ({ children }: { children?: React.ReactNode }) => React.createElement('a', null, children),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { DigitalAssetEditorPage } from '../../../../pages/admin/DigitalAssetEditorPage';

const renderPage = () => render(<DigitalAssetEditorPage />);

const fillBasics = () => {
  fireEvent.change(screen.getByPlaceholderText('Cinematic LUT Pack Vol. 1'), { target: { value: 'My LUTs' } });
  fireEvent.change(screen.getByPlaceholderText('cinematic-lut-pack-vol-1'), { target: { value: 'my-luts' } });
  fireEvent.change(screen.getByPlaceholderText(/What's included/), { target: { value: 'desc' } });
  fireEvent.change(screen.getByPlaceholderText(/0 = free/), { target: { value: '499' } });
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.createAsset.mockResolvedValue({ id: 'a1' });
});

describe('DigitalAssetEditorPage (create mode)', () => {
  it('renders the create heading', () => {
    renderPage();
    expect(screen.getByText('Create New Asset')).toBeInTheDocument();
  });

  it('shows a validation error when required fields are empty', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Create Asset' }));
    expect(mockShowToast).toHaveBeenCalledWith('Please fill in all required fields', 'error');
    expect(mockApi.createAsset).not.toHaveBeenCalled();
  });

  it('requires a file before creating', () => {
    renderPage();
    fillBasics();
    fireEvent.click(screen.getByRole('button', { name: 'Create Asset' }));
    expect(mockShowToast).toHaveBeenCalledWith('Please upload the asset file', 'error');
    expect(mockApi.createAsset).not.toHaveBeenCalled();
  });

  it('creates an asset (price → paise, uploaded path threaded) and navigates back', async () => {
    renderPage();
    fillBasics();
    fireEvent.click(screen.getByText('mock-upload')); // simulate in-app upload complete
    fireEvent.click(screen.getByRole('button', { name: 'Create Asset' }));

    await waitFor(() => expect(mockApi.createAsset).toHaveBeenCalledTimes(1));
    expect(mockApi.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-luts', title: 'My LUTs', price: 49900, storagePath: 'assets/x.zip', fileExt: 'zip' }),
    );
    expect(mockShowToast).toHaveBeenCalledWith('Asset created!', 'success');
    expect(mockNavigate).toHaveBeenCalledWith('/admin/digital-assets');
  });

  it('rejects an invalid slug', () => {
    renderPage();
    fillBasics();
    fireEvent.change(screen.getByPlaceholderText('cinematic-lut-pack-vol-1'), { target: { value: 'Bad Slug!' } });
    fireEvent.click(screen.getByText('mock-upload'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Asset' }));
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Slug must be'), 'error');
    expect(mockApi.createAsset).not.toHaveBeenCalled();
  });
});
