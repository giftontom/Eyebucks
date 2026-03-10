import { Heart } from 'lucide-react';
import React from 'react';

import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../hooks/useWishlist';

interface WishlistButtonProps {
  courseId: string;
  className?: string;
  size?: number;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({ courseId, className = '', size = 20 }) => {
  const { user, login } = useAuth();
  const { isSaved, toggle } = useWishlist();

  const saved = isSaved(courseId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { await login(); return; }
    await toggle(courseId);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={saved}
      className={`flex items-center justify-center rounded-full transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 outline-none ${
        saved
          ? 'text-brand-500 hover:text-brand-400'
          : 't-text-3 hover:text-brand-400'
      } ${className}`}
    >
      <Heart
        size={size}
        fill={saved ? 'currentColor' : 'none'}
        className={`transition-transform ${saved ? 'scale-110' : 'scale-100'}`}
      />
    </button>
  );
};
