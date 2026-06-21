import { Send, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import { StarRating } from './StarRating';

interface ReviewFormProps {
  courseId: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onCancel?: () => void;
  initialRating?: number;
  initialComment?: string;
  isEditing?: boolean;
}

/**
 * Form for submitting or editing a course review
 */
export const ReviewForm: React.FC<ReviewFormProps> = ({
  courseId: _courseId, // Reserved for future use (analytics, API calls)
  onSubmit,
  onCancel,
  initialRating = 0,
  initialComment = '',
  isEditing = false
}) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Review must be at least 10 characters');
      return;
    }

    if (comment.length > 1000) {
      setError('Review must not exceed 1000 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(rating, comment.trim());

      // Reset form if not editing
      if (!isEditing) {
        setRating(0);
        setComment('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rating */}
      <div>
        <label className="block text-sm font-medium t-text mb-2">
          Your Rating *
        </label>
        <StarRating
          value={rating}
          onChange={setRating}
          size="lg"
        />
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="review-comment" className="block text-sm font-medium t-text mb-2">
          Your Review *
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this course. What did you learn? Would you recommend it?"
          rows={6}
          maxLength={1000}
          className="w-full px-4 py-3 border t-border rounded-lg
                     t-input-bg t-text placeholder:t-text-3
                     focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                     resize-none"
        />
        <div className="mt-1 flex justify-between text-xs t-text-2">
          <span>Minimum 10 characters</span>
          <span>{comment.length}/1000</span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 t-status-danger border rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || rating === 0 || comment.trim().length < 10}
          className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-lg
                     font-medium hover:bg-brand-500 disabled:opacity-50
                     disabled:cursor-not-allowed transition-colors
                     flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              {isEditing ? 'Update Review' : 'Submit Review'}
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border t-border t-text rounded-lg
                       font-medium hover:t-bg-alt disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
