import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

import { reviewsApi } from '../../../services/api/reviews.api';

describe('reviewsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReview', () => {
    it('should throw when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(reviewsApi.createReview('c', 5, 'Great!')).rejects.toThrow('Not authenticated');
    });

    it('should create review for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const mockReview = {
        id: 'rev-1',
        user_id: 'user-1',
        course_id: 'c1',
        rating: 5,
        comment: 'Excellent course!',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockReview, error: null }),
          }),
        }),
      });

      const result = await reviewsApi.createReview('c1', 5, 'Excellent course!');
      expect(result.success).toBe(true);
      expect(result.review.rating).toBe(5);
    });
  });

  describe('updateReview', () => {
    it('should update review rating and comment', async () => {
      const mockUpdated = { id: 'rev-1', rating: 4, comment: 'Updated' };
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
            }),
          }),
        }),
      });

      const result = await reviewsApi.updateReview('rev-1', 4, 'Updated');
      expect(result.success).toBe(true);
      expect(result.review.rating).toBe(4);
    });

    it('should throw on DB error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      });

      await expect(reviewsApi.updateReview('x', 1, '')).rejects.toThrow('Not found');
    });
  });

  describe('deleteReview', () => {
    it('should delete review successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await reviewsApi.deleteReview('rev-1');
      expect(result.success).toBe(true);
    });

    it('should throw on delete error', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Forbidden' } }),
        }),
      });

      await expect(reviewsApi.deleteReview('rev-1')).rejects.toThrow('Forbidden');
    });
  });

  describe('getCourseReviews', () => {
    it('should return reviews with summary', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'r1',
                    user_id: 'u1',
                    rating: 5,
                    comment: 'Great',
                    helpful: 3,
                    created_at: '2024-01-01',
                    updated_at: '2024-01-01',
                    users: { name: 'Alice', avatar: 'a.jpg' },
                  },
                ],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: {
          total: 3,
          average_rating: 4.67,
          distribution: { '5': 2, '4': 1, '3': 0, '2': 0, '1': 0 },
        },
        error: null,
      });

      const result = await reviewsApi.getCourseReviews('course-1');
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].user.name).toBe('Alice');
      expect(result.summary.total).toBe(1); // from paginated count
      expect(result.summary.averageRating).toBeCloseTo(4.67, 1);
      expect(result.summary.distribution[5]).toBe(2);
      expect(result.summary.distribution[4]).toBe(1);
    });

    it('should return empty reviews for course with no reviews', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 0,
              }),
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: {
          total: 0,
          average_rating: 0,
          distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
        },
        error: null,
      });

      const result = await reviewsApi.getCourseReviews('empty-course');
      expect(result.reviews).toEqual([]);
      expect(result.summary.total).toBe(0);
      expect(result.summary.averageRating).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });
  });
});
