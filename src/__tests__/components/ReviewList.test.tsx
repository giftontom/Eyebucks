import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCourseReviews = vi.fn();

vi.mock('../../../services/api', () => ({
  reviewsApi: { getCourseReviews: (...args: any[]) => mockGetCourseReviews(...args) },
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User' },
  }),
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn() },
}));

import { ReviewList } from '../../../components/ReviewList';

const mockReviewsResponse = {
  success: true,
  reviews: [
    {
      id: 'r1',
      userId: 'user-2',
      rating: 5,
      comment: 'Great course!',
      helpful: 3,
      user: { name: 'Alice', avatar: 'alice.jpg' },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ],
  summary: {
    total: 1,
    averageRating: 5,
    distribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
  },
  pagination: { hasMore: false },
};

describe('ReviewList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCourseReviews.mockResolvedValue(mockReviewsResponse);
  });

  it('renders reviews after loading', async () => {
    render(<ReviewList courseId="c1" />);
    await waitFor(() => {
      expect(screen.getByText('Great course!')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('shows empty state when no reviews', async () => {
    mockGetCourseReviews.mockResolvedValue({
      success: true,
      reviews: [],
      summary: { total: 0, averageRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
      pagination: { hasMore: false },
    });

    render(<ReviewList courseId="c1" />);
    await waitFor(() => {
      expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
    });
  });

  it('shows review summary with average rating', async () => {
    render(<ReviewList courseId="c1" />);
    await waitFor(() => {
      expect(screen.getByText('5.0')).toBeInTheDocument();
      expect(screen.getByText(/based on 1 review/i)).toBeInTheDocument();
    });
  });

  it('shows "Write a Review" button when canReview is true', async () => {
    render(<ReviewList courseId="c1" canReview />);
    await waitFor(() => {
      expect(screen.getByText('Write a Review')).toBeInTheDocument();
    });
  });

  it('shows "Load More Reviews" when hasMore is true', async () => {
    mockGetCourseReviews.mockResolvedValue({
      ...mockReviewsResponse,
      pagination: { hasMore: true },
    });

    render(<ReviewList courseId="c1" />);
    await waitFor(() => {
      expect(screen.getByText('Load More Reviews')).toBeInTheDocument();
    });
  });

  it('shows helpful count', async () => {
    render(<ReviewList courseId="c1" />);
    await waitFor(() => {
      expect(screen.getByText('Helpful (3)')).toBeInTheDocument();
    });
  });

  it('shows loading spinner initially', () => {
    mockGetCourseReviews.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ReviewList courseId="c1" />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });
});
