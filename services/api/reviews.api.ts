/**
 * Reviews API - Course review CRUD operations
 */
import { supabase } from '../supabase';

export interface ReviewUser {
  name: string;
  avatar: string;
}

export interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  helpful: number;
  user: ReviewUser;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  total: number;
  averageRating: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

export interface ReviewsResponse {
  success: boolean;
  reviews: Review[];
  summary: ReviewSummary;
  pagination: { hasMore: boolean };
}

export const reviewsApi = {
  async getCourseReviews(
    courseId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ReviewsResponse> {
    const offset = (page - 1) * limit;

    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select(`
        id, user_id, rating, comment, helpful, created_at, updated_at,
        users:user_id (name, avatar)
      `, { count: 'exact' })
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('course_id', courseId);

    const total = allReviews?.length || 0;
    const avgRating = total > 0
      ? allReviews!.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews?.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating]++;
      }
    });

    return {
      success: true,
      reviews: (reviews || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        rating: r.rating,
        comment: r.comment,
        helpful: r.helpful,
        user: { name: r.users?.name || 'Anonymous', avatar: r.users?.avatar || '' },
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      summary: { total, averageRating: avgRating, distribution },
      pagination: { hasMore: (count || 0) > offset + limit },
    };
  },

  async createReview(
    courseId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; review: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        course_id: courseId,
        rating,
        comment,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, review: data };
  },

  async updateReview(
    reviewId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; review: any }> {
    const { data, error } = await supabase
      .from('reviews')
      .update({ rating, comment })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, review: data };
  },

  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw new Error(error.message);
    return { success: true };
  },
};
