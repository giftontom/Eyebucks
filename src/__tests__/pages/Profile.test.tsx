import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HashRouter } from 'react-router-dom';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockCertificatesApi, mockPaymentsApi } = vi.hoisted(() => ({
  mockCertificatesApi: { getUserCertificates: vi.fn() },
  mockPaymentsApi: { getUserPayments: vi.fn() },
}));

vi.mock('../../../services/api/certificates.api', () => ({
  certificatesApi: mockCertificatesApi,
}));

vi.mock('../../../services/api/payments.api', () => ({
  paymentsApi: mockPaymentsApi,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { useAuth } from '../../../context/AuthContext';
import { Profile } from '../../../pages/Profile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const mockUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@test.com',
  avatar: '',
  role: 'USER' as const,
  phone_e164: null,
};

const mockCert = {
  id: 'cert-1',
  userId: 'u1',
  courseId: 'c1',
  certificateNumber: 'CERT-001',
  studentName: 'Alice',
  courseTitle: 'React Fundamentals',
  issueDate: '2026-01-01T00:00:00Z',
  completionDate: '2026-01-01T00:00:00Z',
  downloadUrl: 'https://example.com/cert.pdf',
  status: 'ACTIVE' as const,
};

const mockPayment = {
  id: 'pay-1',
  userId: 'u1',
  courseId: 'c1',
  courseTitle: 'React Fundamentals',
  amount: 99900,
  status: 'captured' as const,
  razorpayOrderId: 'order-123',
  razorpayPaymentId: 'pay-123',
  receiptNumber: 'REC-001',
  createdAt: '2026-01-15T00:00:00Z',
};

function renderPage() {
  return render(
    <HashRouter>
      <Profile />
    </HashRouter>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: mockUser,
    updateProfile: vi.fn().mockResolvedValue(undefined),
    updatePhoneNumber: vi.fn().mockResolvedValue(undefined),
  });
  mockCertificatesApi.getUserCertificates.mockResolvedValue([mockCert]);
  mockPaymentsApi.getUserPayments.mockResolvedValue({ payments: [mockPayment] });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Profile', () => {

  // ─── Profile card ──────────────────────────────────────────────────────────

  it('renders user name, email, and avatar initial', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument(); // avatar initial
  });

  it('shows phone input when phone_e164 is null', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Alice'));
    expect(screen.getByPlaceholderText('+15550000000')).toBeInTheDocument();
  });

  it('shows phone number when phone_e164 is set', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, phone_e164: '+919876543210' },
      updateProfile: vi.fn(),
      updatePhoneNumber: vi.fn(),
    });
    renderPage();
    await waitFor(() => screen.getByText('Alice'));
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('+15550000000')).not.toBeInTheDocument();
  });

  it('enters name edit mode on edit icon click', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /edit name/i }));
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    // Multiple Save buttons may exist (name + phone); at least one must be present
    expect(screen.getAllByRole('button', { name: /^save$/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls updateProfile with new name and exits edit mode on Save', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: mockUser, updateProfile, updatePhoneNumber: vi.fn() });
    const user = userEvent.setup();

    renderPage();
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /edit name/i }));

    const input = screen.getByDisplayValue('Alice');
    await user.clear(input);
    await user.type(input, 'Alice Smith');
    // Click the first Save button (name edit save — appears before phone save)
    fireEvent.click(screen.getAllByRole('button', { name: /^save$/i })[0]);

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ name: 'Alice Smith' }));
  });

  it('cancels name editing and restores original name on Cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /edit name/i }));

    const input = screen.getByDisplayValue('Alice');
    await user.clear(input);
    await user.type(input, 'Changed Name');
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.queryByDisplayValue('Changed Name')).not.toBeInTheDocument();
  });

  it('shows validation error for malformed phone number', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Alice'));

    const phoneInput = screen.getByPlaceholderText('+15550000000');
    await user.type(phoneInput, 'not-a-phone');
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText(/enter a valid number/i)).toBeInTheDocument()
    );
  });

  it('calls updatePhoneNumber with valid E.164 number', async () => {
    const updatePhoneNumber = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: mockUser, updateProfile: vi.fn(), updatePhoneNumber });
    const user = userEvent.setup();

    renderPage();
    await waitFor(() => screen.getByText('Alice'));

    await user.type(screen.getByPlaceholderText('+15550000000'), '+15550000000');
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(updatePhoneNumber).toHaveBeenCalledWith('+15550000000'));
  });

  // ─── Certificates ──────────────────────────────────────────────────────────

  it('displays certificate list after loading', async () => {
    renderPage();
    // React Fundamentals appears in both cert and payment sections
    await waitFor(() => expect(screen.getAllByText('React Fundamentals').length).toBeGreaterThan(0));
    expect(screen.getByText('CERT-001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
  });

  it('shows empty certificates state', async () => {
    mockCertificatesApi.getUserCertificates.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no certificates earned yet/i)).toBeInTheDocument()
    );
  });

  it('shows certificates error state and retry button', async () => {
    mockCertificatesApi.getUserCertificates.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /try again/i }).length).toBeGreaterThan(0);
  });

  it('retries certificate fetch when "Try again" is clicked', async () => {
    mockCertificatesApi.getUserCertificates
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([mockCert]);

    renderPage();
    await waitFor(() => screen.getByText('Network error'));
    fireEvent.click(screen.getAllByRole('button', { name: /try again/i })[0]);

    await waitFor(() =>
      expect(screen.getAllByText('React Fundamentals').length).toBeGreaterThan(0)
    );
    expect(mockCertificatesApi.getUserCertificates).toHaveBeenCalledTimes(2);
  });

  // ─── Payment history ───────────────────────────────────────────────────────

  it('displays payment history with course title and formatted amount', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('React Fundamentals').length).toBeGreaterThan(0));
    // Amount rendered as ₹999 (99900 paise / 100)
    expect(screen.getAllByText(/₹999/).length).toBeGreaterThan(0);
  });

  it('shows empty payment state when no payments', async () => {
    mockPaymentsApi.getUserPayments.mockResolvedValue({ payments: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument());
  });

  it('shows Receipt button only for "captured" payments', async () => {
    mockPaymentsApi.getUserPayments.mockResolvedValue({
      payments: [
        { ...mockPayment, id: 'pay-1', status: 'captured' },
        { ...mockPayment, id: 'pay-2', status: 'pending', courseTitle: 'Another Course' },
      ],
    });
    renderPage();
    await waitFor(() => screen.getAllByText('React Fundamentals'));
    // Receipt button rendered in both desktop table and mobile card view per captured payment
    const receiptBtns = screen.getAllByRole('button', { name: /receipt/i });
    // 2 buttons for 1 captured payment (desktop + mobile), 0 for pending
    expect(receiptBtns.length).toBe(2);
  });
});
