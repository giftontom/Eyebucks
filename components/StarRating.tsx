import { Star } from 'lucide-react';
import { useState } from 'react';

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
export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

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

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue;
          const isHalf = !isFilled && star - 0.5 <= displayValue;

          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onMouseEnter={() => !readonly && setHoverValue(star)}
              onMouseLeave={() => !readonly && setHoverValue(null)}
              disabled={readonly}
              className={`
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
                transition-transform duration-150
                ${!readonly && 'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 rounded'}
              `}
              aria-label={`Rate ${star} stars`}
            >
              {isHalf ? (
                <div className="relative">
                  <Star className={`${starSize} text-gray-300`} fill="currentColor" />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                    <Star className={`${starSize} text-yellow-400`} fill="currentColor" />
                  </div>
                </div>
              ) : (
                <Star
                  className={`${starSize} ${
                    isFilled ? 'text-yellow-400' : 'text-gray-300'
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
        <span className="ml-2 text-sm font-medium text-gray-700">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
