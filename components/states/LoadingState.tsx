import { Loader2 } from 'lucide-react';
import React from 'react';

interface LoadingStateProps {
  message?: string;
  /** 'fullscreen' centers in viewport, 'inline' fits the container */
  variant?: 'fullscreen' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 24, md: 40, lg: 56 };

/**
 * Standardized loading indicator.
 * Use 'fullscreen' for route-level suspense fallbacks; 'inline' for section-level loading.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  variant = 'fullscreen',
  size = 'md',
  className = '',
}) => {
  const dimensions = variant === 'fullscreen' ? 'min-h-screen' : 'min-h-[200px]';

  return (
    <div
      className={`${dimensions} flex items-center justify-center t-bg ${className}`}
      role="status"
      aria-label={message}
    >
      <div className="text-center">
        <Loader2
          size={sizeMap[size]}
          className="animate-spin text-brand-600 mx-auto mb-4"
          aria-hidden="true"
        />
        <p className="t-text-2 text-sm">{message}</p>
      </div>
    </div>
  );
};

LoadingState.displayName = 'LoadingState';
