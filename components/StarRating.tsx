import { Star } from 'lucide-react';
import React, { useState, useCallback, useRef } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

/**
 * Star rating component
 * Can be used as display-only or interactive input
 */
export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const touchActive = useRef(false);

  // Touch parity for the hover preview: drag across the stars to preview,
  // lift to commit. Mouse users keep the classic hover-then-click flow.
  const starFromTouch = (e: React.TouchEvent): number | null => {
    const row = rowRef.current;
    if (!row) { return null; }
    const rect = row.getBoundingClientRect();
    if (rect.width === 0) { return null; }
    const x = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX;
    if (x === undefined) { return null; }
    const ratio = (x - rect.left) / rect.width;
    if (ratio < 0 || ratio > 1) { return null; }
    return Math.max(1, Math.min(5, Math.ceil(ratio * 5)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (readonly || !onChange) { return; }
    touchActive.current = true;
    const star = starFromTouch(e);
    if (star !== null) { setHoverValue(star); }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (readonly || !onChange || !touchActive.current) { return; }
    setHoverValue(starFromTouch(e));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (readonly || !onChange || !touchActive.current) { return; }
    touchActive.current = false;
    const star = starFromTouch(e);
    setHoverValue(null);
    if (star !== null) { onChange(star); }
  };

  // The browser takes over (scroll) — drop the preview without committing.
  const handleTouchCancel = () => {
    touchActive.current = false;
    setHoverValue(null);
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const starSize = sizeClasses[size];

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent, star: number) => {
    if (readonly || !onChange) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, star + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, star - 1));
    }
  }, [readonly, onChange]);

  return (
    <div className="flex items-center gap-1" role={readonly ? 'img' : 'radiogroup'} aria-label={readonly ? `Rating: ${value} out of 5 stars` : 'Rating'}>
      <div
        ref={rowRef}
        className="flex items-center"
        style={readonly ? undefined : { touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue;
          const isHalf = !isFilled && star - 0.5 <= displayValue;

          return (
            <button
              key={star}
              type="button"
              role={readonly ? undefined : 'radio'}
              aria-checked={readonly ? undefined : star === value}
              onClick={() => handleClick(star)}
              onKeyDown={(e) => handleKeyDown(e, star)}
              onMouseEnter={() => !readonly && setHoverValue(star)}
              onMouseLeave={() => !readonly && setHoverValue(null)}
              disabled={readonly}
              tabIndex={readonly ? -1 : star === value ? 0 : -1}
              className={`
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
                transition-transform duration-150
                ${!readonly && 'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded'}
              `}
              aria-label={`${star} star${star !== 1 ? 's' : ''}${!readonly && star === value ? ', current rating' : ''}`}
            >
              {isHalf ? (
                <div className="relative">
                  <Star className={`${starSize} t-text-3`} fill="currentColor" />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                    <Star className={`${starSize} text-[color:var(--color-rating-star)]`} fill="currentColor" />
                  </div>
                </div>
              ) : (
                <Star
                  className={`${starSize} ${
                    isFilled ? 'text-[color:var(--color-rating-star)]' : 't-text-3'
                  }`}
                  fill={isFilled ? 'currentColor' : 'none'}
                  strokeWidth={isFilled ? 0 : 2}
                />
              )}
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className="ml-2 text-sm font-medium t-text">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
};
