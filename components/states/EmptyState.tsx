import React from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Optional CTA — renders a link or button */
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * Standardized empty state placeholder.
 * Use when a list or section has no data to display.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`text-center py-16 t-text-2 ${className}`}>
      {icon && <div className="mb-4 opacity-30 flex justify-center">{icon}</div>}
      <h3 className="text-lg font-bold t-text mb-2">{title}</h3>
      {description && <p className="text-sm max-w-md mx-auto mb-6">{description}</p>}
      {action && (
        action.to ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-semibold text-sm transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-semibold text-sm transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
