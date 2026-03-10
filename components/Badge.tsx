import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'default' | 'outline';
export type BadgeSize    = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 't-status-success border',
  warning: 't-status-warning border',
  danger:  't-status-danger border',
  info:    't-status-info border',
  brand:   'bg-brand-600/15 text-brand-400 border border-brand-600/30',
  default: 't-card t-border border t-text-2',
  outline: 'bg-transparent t-border border t-text-2',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

const dotColorVar: Record<BadgeVariant, string> = {
  success: 'var(--status-success-text)',
  warning: 'var(--status-warning-text)',
  danger:  'var(--status-danger-text)',
  info:    'var(--status-info-text)',
  brand:   'rgb(var(--color-brand-400))',
  default: 'var(--text-2)',
  outline: 'var(--text-2)',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
  children,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
  >
    {dot && (
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColorVar[variant] }}
      />
    )}
    {children}
  </span>
);

const statusMap: Record<string, BadgeVariant> = {
  PUBLISHED: 'success',
  ACTIVE:    'success',
  captured:  'success',
  DRAFT:     'warning',
  refunded:  'warning',
  REVOKED:   'danger',
  failed:    'danger',
  PENDING:   'info',
  pending:   'info',
  EXPIRED:   'default',
  MODULE:    'default',
  USER:      'info',
  ADMIN:     'brand',
  BUNDLE:    'brand',
};

export function statusToVariant(status: string): BadgeVariant {
  return statusMap[status] ?? 'default';
}
