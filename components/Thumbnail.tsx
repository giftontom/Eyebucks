import { Clapperboard } from 'lucide-react';
import React, { useState } from 'react';

interface ThumbnailProps {
  /** Image URL. Falls back to a branded placeholder when missing or it fails to load. */
  src?: string | null;
  /** Alt text (also used as the placeholder's accessible label). */
  alt: string;
  /** Classes applied to the rendered element — pass the sizing/fit classes here (e.g. `w-full h-full object-cover`). */
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Course/cover image with a resilient fallback. Renders the image when available,
 * but swaps to a theme-aware gradient placeholder (with a film icon) if `src` is
 * missing **or the image fails to load** (e.g. an invalid/404 thumbnail URL).
 *
 * The same `className` is applied to both branches so the placeholder fills the
 * same box as the image would.
 */
export const Thumbnail: React.FC<ThumbnailProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900 ${className}`}
      >
        <Clapperboard className="t-text-3 opacity-40" size={40} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
Thumbnail.displayName = 'Thumbnail';
