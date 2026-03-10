import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  containerClassName?: string;
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3.5 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

const BASE = 'w-full t-input-bg t-border border rounded-lg t-text placeholder:t-text-3 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leadingIcon,
  trailingIcon,
  size = 'md',
  containerClassName = '',
  className = '',
  id,
  ...rest
}, ref) => {
  const hasLeading  = Boolean(leadingIcon);
  const hasTrailing = Boolean(trailingIcon);
  const errorStyle  = error
    ? 'border-[var(--status-danger-border)] focus:ring-[var(--status-danger-text)]'
    : '';
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold t-text-2 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {hasLeading && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 t-text-3 pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${BASE} ${sizeClasses[size]} ${hasLeading ? 'pl-10' : ''} ${hasTrailing ? 'pr-10' : ''} ${errorStyle} ${className}`}
          {...rest}
        />
        {hasTrailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 t-text-3 pointer-events-none">
            {trailingIcon}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--status-danger-text)' }}>{error}</p>
      )}
      {!error && hint && (
        <p className="mt-1 text-xs t-text-3">{hint}</p>
      )}
    </div>
  );
});
Input.displayName = 'Input';
