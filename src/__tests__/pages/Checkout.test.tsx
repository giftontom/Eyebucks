import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted mocks must be before imports that use them
const { mockCoursesApi, mockEnrollmentsApi, mockCouponsApi, mockUser, mockLogin } = vi.hoisted(() => ({
  mockCoursesApi: { getCourse: vi.fn() },
  mockEnrollmentsApi: { checkAccess: vi.fn() },
  mockCouponsApi: { applyCoupon: vi.fn() },
  // Stable reference — must not be re-created each render or useEffect [user] deps loop infinitely
  mockUser: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'USER', phone_e164: '+919876543210' },
  mockLogin: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    session: { access_token: 'mock-token' },
    isLoading: false,
    login: mockLogin,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../../services/api', () => ({
  coursesApi: mockCoursesApi,
  enrollmentsApi: mockEnrollmentsApi,
  checkoutApi: { createOrder: vi.fn(), verifyPayment: vi.fn() },
  couponsApi: mockCouponsApi,
}));

vi.mock('../../../services/supabase', () => ({
  supabase: {
    auth: { refreshSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null }) },
  },
}));

vi.mock('../../../hooks/useScript', () => ({ useScript: () => true }));
vi.mock('../../../utils/analytics', () => ({ analytics: { track: vi.fn() } }));

// Mock the entire components barrel to avoid loading VideoPlayer/hls.js
vi.mock('../../../components', () => ({
  Button: ({ children, onClick, disabled, className }: any) =>
    React.createElement('button', { onClick, disabled, className }, children),
  Input: ({ placeholder, value, onChange, error, containerClassName }: any) =>
    React.createElement(React.Fragment, null,
      React.createElement('input', { placeholder, value, onChange }),
      error ? React.createElement('span', { role: 'alert' }, error) : null,
    ),
  VideoPlayer: () => null,
  EnrollmentGate: ({ children }: any) => children,
  ErrorBoundary: ({ children }: any) => children,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'course-123' }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
  HashRouter: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

import { analytics } from '../../../utils/analytics';
import { Checkout } from '../../../pages/Checkout';

const mockCourse = {
  id: 'course-123', title: 'Test Course', description: 'A great course',
  price: 99900, thumbnail: '', type: 'MODULE', status: 'PUBLISHED',
  features: [], rating: 4.5, totalStudents: 100,
};

describe('Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoursesApi.getCourse.mockResolvedValue({ course: mockCourse });
    mockEnrollmentsApi.checkAccess.mockResolvedValue(false);
  });

  const renderCheckout = () => render(<HashRouter><Checkout /></HashRouter>);

  it('displays course title after loading', async () => {
    renderCheckout();
    await waitFor(() => expect(screen.getByText('Test Course')).toBeInTheDocument());
  });

  it('fires checkout_started analytics event on load', async () => {
    renderCheckout();
    await waitFor(() =>
      expect(analytics.track).toHaveBeenCalledWith('checkout_started', expect.objectContaining({
        course_id: 'course-123', course_title: 'Test Course',
      }))
    );
  });

  it('shows already-enrolled UI when user owns course', async () => {
    mockEnrollmentsApi.checkAccess.mockResolvedValue(true);
    renderCheckout();
    await waitFor(() => expect(screen.getByText(/already own this course/i)).toBeInTheDocument());
  });

  it('shows coupon error for invalid code', async () => {
    mockCouponsApi.applyCoupon.mockRejectedValue(new Error('Invalid coupon code'));
    renderCheckout();
    await waitFor(() => expect(screen.getByText('Test Course')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/coupon/i), { target: { value: 'BAD' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() => expect(screen.getByText('Invalid coupon code')).toBeInTheDocument());
  });

  it('fires coupon_applied analytics when valid coupon applied', async () => {
    mockCouponsApi.applyCoupon.mockResolvedValue({ discountPct: 20, couponUseId: 'use-1' });
    renderCheckout();
    await waitFor(() => expect(screen.getByText('Test Course')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/coupon/i), { target: { value: 'SAVE20' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() =>
      expect(analytics.track).toHaveBeenCalledWith('coupon_applied', expect.objectContaining({
        coupon_code: 'SAVE20', discount_pct: 20,
      }))
    );
  });

  it('shows discount breakdown and discounted pay button after valid coupon applied', async () => {
    mockCouponsApi.applyCoupon.mockResolvedValue({ discountPct: 20, couponUseId: 'use-1' });
    renderCheckout();
    await waitFor(() => screen.getByText('Test Course'));
    fireEvent.change(screen.getByPlaceholderText(/coupon/i), { target: { value: 'SAVE20' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    // Coupon success indicator — "20% discount applied!"
    await waitFor(() => expect(screen.getByText(/20% discount applied/i)).toBeInTheDocument());
    // Pay button shows discounted price: 99900 * 0.8 = 79920 paise = ₹799
    expect(screen.getByRole('button', { name: /pay ₹/i })).toBeInTheDocument();
  });

  it('shows ₹0 pay button when 100% coupon applied', async () => {
    mockCouponsApi.applyCoupon.mockResolvedValue({ discountPct: 100, couponUseId: 'use-free' });
    renderCheckout();
    await waitFor(() => screen.getByText('Test Course'));
    fireEvent.change(screen.getByPlaceholderText(/coupon/i), { target: { value: 'FREE100' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() => expect(screen.getByText(/100% discount applied/i)).toBeInTheDocument());
    // Pay button shows ₹0
    expect(screen.getByRole('button', { name: /pay ₹0/i })).toBeInTheDocument();
  });

  it('apply button shows ✓ and becomes disabled after coupon is applied', async () => {
    mockCouponsApi.applyCoupon.mockResolvedValue({ discountPct: 20, couponUseId: 'use-1' });
    renderCheckout();
    await waitFor(() => screen.getByText('Test Course'));
    fireEvent.change(screen.getByPlaceholderText(/coupon/i), { target: { value: 'SAVE20' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() => screen.getByText(/20% discount applied/i));
    // Apply button text changes to ✓ and is disabled when coupon is applied
    const applyBtn = screen.getByRole('button', { name: '✓' });
    expect(applyBtn).toBeDisabled();
  });
});
