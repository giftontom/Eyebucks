import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Edit2, Trash2, Loader2, Star } from 'lucide-react';
import { StarRating } from './StarRating';
import { ReviewForm } from './ReviewForm';
import { useAuth } from '../context/AuthContext';
import { reviewsApi } from '../services/api';
import { logger } from '../utils/logger';
import type { Review, ReviewSummary } from '../services/api/reviews.api';

interface ReviewListProps {
  courseId: string;
  canReview?: boolean;
  onReviewSubmitted?: () => void;
}

/**
 * Display list of reviews for a course with submission form
 */
export const ReviewList: React.FC<ReviewListProps> = ({
  courseId,
  canReview = false,
  onReviewSubmitted
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [courseId, page]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await reviewsApi.getCourseReviews(courseId, page, 10);

      if (response.success) {
        setReviews(page === 1 ? response.reviews : [...reviews, ...response.reviews]);
        setSummary(response.summary);
        setHasMore(response.pagination.hasMore);
      }
    } catch (error) {
      logger.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    try {
      const response = await reviewsApi.createReview(courseId, rating, comment);

      if (response.success) {
        setShowReviewForm(false);
        fetchReviews(); // Refresh reviews
        onReviewSubmitted?.();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit review';
      throw new Error(message);
    }
  };

  const handleUpdateReview = async (reviewId: string, rating: number, comment: string) => {
    try {
      const response = await reviewsApi.updateReview(reviewId, rating, comment);

      if (response.success) {
        setEditingReviewId(null);
        fetchReviews(); // Refresh reviews
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update review';
      throw new Error(message);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await reviewsApi.deleteReview(reviewId);
      fetchReviews(); // Refresh reviews
    } catch (error) {
      alert('Failed to delete review');
    }
  };

  const isUserReview = (review: Review) => {
    return user && (review.userId === user.id || review.user.name === user.name);
  };

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      {summary && summary.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">
                {summary.averageRating.toFixed(1)}
              </div>
              <StarRating value={summary.averageRating} size="lg" readonly />
              <div className="mt-2 text-sm text-gray-600">
                Based on {summary.total} review{summary.total !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.distribution[stars as keyof typeof summary.distribution];
                const percentage = summary.total > 0 ? (count / summary.total) * 100 : 0;

                return (
                  <div key={stars} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium text-gray-700">{stars}</span>
                      <Star className="h-4 w-4 text-yellow-400" fill="currentColor" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Review Form */}
      {canReview && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg
                     text-gray-600 hover:border-brand-500 hover:text-brand-600
                     transition-colors font-medium flex items-center justify-center gap-2"
        >
          <MessageSquare className="h-5 w-5" />
          Write a Review
        </button>
      )}

      {showReviewForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Write Your Review</h3>
          <ReviewForm
            courseId={courseId}
            onSubmit={handleSubmitReview}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading && page === 1 ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No reviews yet. Be the first to review this course!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              {editingReviewId === review.id ? (
                <ReviewForm
                  courseId={courseId}
                  onSubmit={(rating, comment) => handleUpdateReview(review.id, rating, comment)}
                  onCancel={() => setEditingReviewId(null)}
                  initialRating={review.rating}
                  initialComment={review.comment}
                  isEditing
                />
              ) : (
                <>
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={review.user.avatar}
                        alt={review.user.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{review.user.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {review.updatedAt !== review.createdAt && ' (edited)'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {isUserReview(review) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingReviewId(review.id)}
                          className="p-2 text-gray-400 hover:text-brand-600 transition-colors"
                          title="Edit review"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete review"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="mb-3">
                    <StarRating value={review.rating} size="sm" readonly />
                  </div>

                  {/* Comment */}
                  <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>

                  {/* Footer */}
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                    <button className="flex items-center gap-1 hover:text-brand-600 transition-colors">
                      <ThumbsUp className="h-4 w-4" />
                      <span>Helpful ({review.helpful})</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}

        {/* Load More */}
        {hasMore && (
          <button
            onClick={() => setPage(page + 1)}
            disabled={isLoading}
            className="w-full px-6 py-3 border border-gray-300 rounded-lg
                       text-gray-700 hover:bg-gray-50 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              'Load More Reviews'
            )}
          </button>
        )}
      </div>
    </div>
  );
};
