import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdatePhoneNumber = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ updatePhoneNumber: mockUpdatePhoneNumber }),
}));

import { PhoneGateModal } from '../../../components/PhoneGateModal';

describe('PhoneGateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePhoneNumber.mockResolvedValue(undefined);
  });

  it('renders phone input and heading', () => {
    render(<PhoneGateModal />);
    expect(screen.getByText('Add Your Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
  });

  it('shows validation error for invalid phone number', async () => {
    render(<PhoneGateModal />);
    await userEvent.type(screen.getByLabelText('Phone Number'), '12345');
    await userEvent.click(screen.getByText('Continue'));
    expect(screen.getByText(/enter a valid phone number/i)).toBeInTheDocument();
  });

  it('calls updatePhoneNumber with valid E.164 number', async () => {
    render(<PhoneGateModal />);
    await userEvent.type(screen.getByLabelText('Phone Number'), '+919876543210');
    await userEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(mockUpdatePhoneNumber).toHaveBeenCalledWith('+919876543210');
    });
  });

  it('disables submit button when phone is empty', () => {
    render(<PhoneGateModal />);
    expect(screen.getByText('Continue')).toBeDisabled();
  });
});
