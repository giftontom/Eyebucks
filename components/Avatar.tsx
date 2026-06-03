import React, { useState } from 'react';

interface AvatarProps {
  /** Image URL (e.g. a Google profile picture). Falls back to initials when missing or it fails to load. */
  src?: string | null;
  /** Display name — used for the initials fallback and the alt text. */
  name?: string | null;
  /** Pixel size of the (square) avatar. */
  size?: number;
  /** Extra classes applied to the rendered element (img or fallback). */
  className?: string;
}

/** Derive up-to-two-letter initials from a name ("Gifton Tom" → "GT", "Shabeeb" → "S"). */
function initials(name?: string | null): string {
  if (!name) { return '?'; }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) { return '?'; }
  if (parts.length === 1) { return parts[0].charAt(0).toUpperCase(); }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * User avatar with a resilient fallback. Renders the image when available, but
 * swaps to a branded initials circle if `src` is missing **or the image fails to
 * load** (e.g. a Google `lh3.googleusercontent.com` URL that 429s). `referrerPolicy`
 * is set to `no-referrer`, which also reduces those rate-limit failures.
 */
export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 40, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const dims = { width: size, height: size };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`rounded-full object-cover ${className}`}
        style={dims}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name || 'User avatar'}
      className={`rounded-full flex items-center justify-center font-bold bg-brand-600/10 text-brand-500 select-none ${className}`}
      style={{ ...dims, fontSize: Math.max(11, Math.round(size * 0.4)) }}
    >
      {initials(name)}
    </div>
  );
};
Avatar.displayName = 'Avatar';
