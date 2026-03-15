import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../context/AuthContext';
import { wishlistApi } from '../services/api/wishlist.api';
import { useToast } from '../components/Toast';
import { analytics } from '../utils/analytics';
import { logger } from '../utils/logger';

/**
 * Manages the current user's course wishlist with optimistic updates.
 *
 * On mount (when the user changes), loads all wishlist course IDs from Supabase.
 * The `toggle()` function applies an optimistic update immediately and rolls back
 * on error, showing a toast notification. A `pendingRef` set prevents concurrent
 * toggles for the same course (double-click guard).
 *
 * Resets to an empty set when the user logs out.
 *
 * @returns Object with:
 *   - `isSaved(courseId)` — returns `true` if the course is in the wishlist
 *   - `toggle(courseId)` — adds or removes a course; no-op if user is not authenticated
 *   - `wishlistIds` — `Set<string>` of all saved course IDs
 *   - `isLoading` — `true` while the initial wishlist is loading
 *
 * @example
 * ```tsx
 * const { isSaved, toggle, isLoading } = useWishlist();
 * <WishlistButton saved={isSaved(courseId)} onToggle={() => toggle(courseId)} />
 * ```
 */
export function useWishlist() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  // Guard against double-click race conditions
  const pendingRef = useRef<Set<string>>(new Set());

  // Load wishlist on mount when user is authenticated
  useEffect(() => {
    if (!user) { setWishlistIds(new Set()); return; }
    setIsLoading(true);
    wishlistApi.list()
      .then(entries => setWishlistIds(new Set(entries.map(e => e.courseId))))
      .catch((err) => logger.warn('[useWishlist] Failed to load wishlist:', err))
      .finally(() => setIsLoading(false));
  }, [user]);

  const isSaved = useCallback((courseId: string) => wishlistIds.has(courseId), [wishlistIds]);

  const toggle = useCallback(async (courseId: string) => {
    if (!user) { return; }
    // Prevent concurrent toggles for the same course (double-click guard)
    if (pendingRef.current.has(courseId)) { return; }
    pendingRef.current.add(courseId);

    // Optimistic update
    const wasSaved = wishlistIds.has(courseId);
    setWishlistIds(prev => {
      const next = new Set(prev);
      if (wasSaved) { next.delete(courseId); } else { next.add(courseId); }
      return next;
    });

    try {
      if (wasSaved) {
        await wishlistApi.remove(courseId);
        analytics.track('wishlist_removed', { course_id: courseId });
      } else {
        await wishlistApi.add(courseId);
        analytics.track('wishlist_added', { course_id: courseId });
      }
    } catch (err) {
      logger.error('[useWishlist] Toggle failed, rolling back:', err);
      // Rollback optimistic update and notify user
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (wasSaved) { next.add(courseId); } else { next.delete(courseId); }
        return next;
      });
      showToast(wasSaved ? 'Failed to remove from wishlist' : 'Failed to add to wishlist', 'error');
    } finally {
      pendingRef.current.delete(courseId);
    }
  }, [user, wishlistIds, showToast]);

  return { isSaved, toggle, wishlistIds, isLoading };
}
