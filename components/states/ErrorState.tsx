import { AlertTriangle } from 'lucide-react';
import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Standardized error state display.
 * Use when a data fetch fails or a component encounters a recoverable error.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center min-h-[200px] p-4 ${className}`} role="alert">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 t-status-danger border rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} style={{ color: 'var(--status-danger-text)' }} />
        </div>
        <h2 className="text-xl font-bold t-text mb-2">{title}</h2>
        <p className="t-text-2 mb-6 text-sm">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-semibold text-sm transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

ErrorState.displayName = 'ErrorState';
