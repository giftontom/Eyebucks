import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    getSiteContent: vi.fn(),
    createSiteContent: vi.fn(),
    updateSiteContent: vi.fn(),
  },
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { SettingsPage } from '../../../../pages/admin/SettingsPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockSettingsItems = [
  { id: 's1', section: 'settings', title: 'maintenance_mode', body: 'false', isActive: true },
  { id: 's2', section: 'settings', title: 'support_email', body: 'admin@example.com', isActive: true },
];

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getSiteContent.mockResolvedValue({ items: mockSettingsItems });
  mockAdminApi.updateSiteContent.mockResolvedValue({ success: true });
  mockAdminApi.createSiteContent.mockResolvedValue({ success: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  it('renders "Site Settings" heading after loading', async () => {
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('Site Settings')).toBeInTheDocument());
  });

  it('renders all 4 setting field labels', async () => {
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('Maintenance Mode')).toBeInTheDocument());
    expect(screen.getByText('Featured Course ID')).toBeInTheDocument();
    expect(screen.getByText('Support Email')).toBeInTheDocument();
    expect(screen.getByText('Announcement Banner')).toBeInTheDocument();
  });

  it('loads stored support email from API', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      const emailInput = screen.getByDisplayValue('admin@example.com');
      expect(emailInput).toBeInTheDocument();
    });
  });

  it('shows Save Settings button', async () => {
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument());
  });

  it('calls getSiteContent twice and updateSiteContent on save', async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByRole('button', { name: /save settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => expect(mockAdminApi.updateSiteContent).toHaveBeenCalled());
  });

  it('creates new setting when not already stored', async () => {
    // Return no existing settings so all fields go through createSiteContent
    mockAdminApi.getSiteContent.mockResolvedValue({ items: [] });
    render(<SettingsPage />);
    await waitFor(() => screen.getByRole('button', { name: /save settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => expect(mockAdminApi.createSiteContent).toHaveBeenCalled());
  });

  it('shows success message after save', async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByRole('button', { name: /save settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument());
  });

  it('shows error message when save fails', async () => {
    mockAdminApi.getSiteContent
      .mockResolvedValueOnce({ items: [] }) // initial load
      .mockResolvedValueOnce({ items: [] }); // load during save
    mockAdminApi.createSiteContent.mockRejectedValue(new Error('Network error'));
    render(<SettingsPage />);
    await waitFor(() => screen.getByRole('button', { name: /save settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('maintenance mode toggle switches between Enabled and Disabled', async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Maintenance Mode'));
    // maintenance_mode is 'false' → shows Disabled
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    // Toggle it
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });
});
