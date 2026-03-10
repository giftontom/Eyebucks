import { Loader2 } from 'lucide-react';
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize    = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-[var(--shadow-brand)]',
  secondary: 't-card t-border border hover:bg-[var(--surface-hover)] t-text',
  ghost:     'bg-transparent hover:bg-[var(--surface-hover)] t-text-2 hover:t-text',
  danger:    't-status-danger border hover:opacity-90',
  outline:   'bg-transparent border t-border t-text hover:t-card',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:   'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md:   'px-5 py-2.5 text-sm rounded-full gap-2',
  lg:   'px-7 py-3.5 text-base rounded-full gap-2.5',
  icon: 'p-2 rounded-lg',
};

const BASE = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}, ref) => {
  const resolvedLeft = loading ? <Loader2 size={16} className="animate-spin" /> : leftIcon;

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${BASE} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {resolvedLeft}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
Button.displayName = 'Button';
