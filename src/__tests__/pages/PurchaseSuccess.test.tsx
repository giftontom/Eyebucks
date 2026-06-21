import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('courseId=c1&orderId=ord-1')],
  };
});

const { mockCoursesApi, mockPaymentsApi } = vi.hoisted(() => ({
  mockCoursesApi: { getCourse: vi.fn() },
  mockPaymentsApi: { getPaymentByOrder: vi.fn() },
}));

vi.mock('../../../services/api', () => ({
  coursesApi: mockCoursesApi,
  paymentsApi: mockPaymentsApi,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Test User', email: 'test@test.com' },
    session: { access_token: 'tok' },
    isLoading: false,
  }),
}));

vi.mock('../../../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn(), ToastContainer: () => null }),
}));

vi.mock('../../../utils/analytics', () => ({
  analytics: { track: vi.fn() },
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));

import { PurchaseSuccess } from '../../../pages/PurchaseSuccess';

const mockCourse = {
  id: 'c1',
  title: 'React Mastery',
  description: 'Learn React',
  price: 99900,
  thumbnail: 'thumb.jpg',
  type: 'MODULE',
  status: 'PUBLISHED',
  features: [],
  chapters: [{ id: 'm1' }, { id: 'm2' }],
};

describe('PurchaseSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoursesApi.getCourse.mockResolvedValue({ course: mockCourse });
    mockPaymentsApi.getPaymentByOrder.mockResolvedValue(null);
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <PurchaseSuccess />
      </MemoryRouter>
    );

  it('renders success message and course title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Welcome to the Course!')).toBeInTheDocument();
      expect(screen.getByText('React Mastery')).toBeInTheDocument();
    });
  });

  it('shows "Start Learning Now" button that navigates to learn page', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Start Learning Now')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Start Learning Now'));
    expect(mockNavigate).toHaveBeenCalledWith('/learn/c1');
  });

  it('shows course not found when API returns null', async () => {
    mockCoursesApi.getCourse.mockResolvedValue({ course: null });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Course not found')).toBeInTheDocument();
    });
  });

  it('shows dashboard link', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    });
  });
});
