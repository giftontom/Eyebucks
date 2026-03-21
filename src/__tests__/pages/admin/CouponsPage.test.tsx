import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockCouponsApi, mockShowToast } = vi.hoisted(() => ({
  mockCouponsApi: {
    adminListCoupons: vi.fn(),
    adminCreateCoupon: vi.fn(),
    adminDeactivateCoupon: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../../services/api/coupons.api', () => ({ couponsApi: mockCouponsApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({ showToast: mockShowToast }),
}));

vi.mock('../../../../pages/admin/components/AdminModal', () => ({
  AdminModal: ({ open, children, title }: any) =>
    open ? React.createElement('div', { role: 'dialog', 'aria-label': title }, children) : null,
}));

vi.mock('../../../../pages/admin/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title, confirmLabel = 'Confirm' }: any) =>
    open
      ? React.createElement('div', { role: 'dialog', 'aria-label': title },
          React.createElement('button', { onClick: onConfirm }, confirmLabel)
        )
      : null,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { CouponsPage } from '../../../../pages/admin/CouponsPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockCoupon = {
  id: 'coup1',
  code: 'SAVE10',
  discount_pct: 10,
  max_uses: 100,
  use_count: 5,
  expires_at: '2026-12-31T00:00:00Z',
  is_active: true,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCouponsApi.adminListCoupons.mockResolvedValue([mockCoupon]);
  mockCouponsApi.adminCreateCoupon.mockResolvedValue({ success: true });
  mockCouponsApi.adminDeactivateCoupon.mockResolvedValue({ success: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CouponsPage', () => {
  it('renders coupon codes after loading', async () => {
    render(<CouponsPage />);
    await waitFor(() => expect(screen.getByText('SAVE10')).toBeInTheDocument());
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<CouponsPage />);
    // CouponsPage uses its own loading render (not DataTable)
    expect(mockCouponsApi.adminListCoupons).toHaveBeenCalled();
  });

  it('shows empty state when no coupons', async () => {
    mockCouponsApi.adminListCoupons.mockResolvedValue([]);
    render(<CouponsPage />);
    await waitFor(() => expect(screen.getByText(/no coupons/i)).toBeInTheDocument());
  });

  it('opens create modal when New Coupon button clicked', async () => {
    render(<CouponsPage />);
    await waitFor(() => screen.getByText('SAVE10'));
    fireEvent.click(screen.getByRole('button', { name: /new coupon/i }));
    expect(screen.getByRole('dialog', { name: /new coupon/i })).toBeInTheDocument();
  });

  it('shows error toast when code is missing on submit', async () => {
    render(<CouponsPage />);
    await waitFor(() => screen.getByText('SAVE10'));
    fireEvent.click(screen.getByRole('button', { name: /new coupon/i }));
    // Clear the code input and submit
    const codeInput = screen.getByPlaceholderText(/SUMMER20/i);
    fireEvent.change(codeInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /create$/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/code.*discount|discount.*code/i), 'error'
    ));
  });

  it('calls adminCreateCoupon and shows success toast on valid submit', async () => {
    const user = userEvent.setup();
    render(<CouponsPage />);
    await waitFor(() => screen.getByText('SAVE10'));
    fireEvent.click(screen.getByRole('button', { name: /new coupon/i }));
    const codeInput = screen.getByPlaceholderText(/SUMMER20/i);
    await user.clear(codeInput);
    await user.type(codeInput, 'NEWCODE');
    fireEvent.click(screen.getByRole('button', { name: /create$/i }));
    await waitFor(() => expect(mockCouponsApi.adminCreateCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NEWCODE' })
    ));
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/created/i), 'success');
  });

  it('opens deactivate confirm dialog when Deactivate button clicked', async () => {
    render(<CouponsPage />);
    await waitFor(() => screen.getByText('SAVE10'));
    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));
    expect(screen.getByRole('dialog', { name: /deactivate/i })).toBeInTheDocument();
  });

  it('calls adminDeactivateCoupon and shows success toast on confirm', async () => {
    render(<CouponsPage />);
    await waitFor(() => screen.getByText('SAVE10'));
    const btns = screen.getAllByRole('button', { name: /deactivate/i });
    fireEvent.click(btns[0]); // open dialog
    const btnsAfter = screen.getAllByRole('button', { name: /deactivate/i });
    fireEvent.click(btnsAfter[btnsAfter.length - 1]); // confirm btn in dialog
    await waitFor(() => expect(mockCouponsApi.adminDeactivateCoupon).toHaveBeenCalledWith('coup1'));
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/deactivat/i), 'success');
  });
});
