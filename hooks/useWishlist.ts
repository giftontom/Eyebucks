import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../context/AuthContext';
import { wishlistApi } from '../services/api/wishlist.api';

export function useWishlist() {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Load wishlist on mount when user is authenticated
  useEffect(() => {
    if (!user) { setWishlistIds(new Set()); return; }
    setIsLoading(true);
    wishlistApi.list()
      .then(entries => setWishlistIds(new Set(entries.map(e => e.courseId))))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const isSaved = useCallback((courseId: string) => wishlistIds.has(courseId), [wishlistIds]);

  const toggle = useCallback(async (courseId: string) => {
    if (!user) { return; }

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
      } else {
        await wishlistApi.add(courseId);
      }
    } catch {
      // Rollback on failure
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (wasSaved) { next.add(courseId); } else { next.delete(courseId); }
        return next;
      });
    }
  }, [user, wishlistIds]);

  return { isSaved, toggle, wishlistIds, isLoading };
}
