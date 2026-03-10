import React from 'react';

export interface CardProps {
  variant?: 'default' | 'glass';
  radius?: 'lg' | 'xl' | '2xl' | '3xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const variantClasses = {
  default: 't-card t-border border',
  glass:   'bg-white/5 border border-white/10 backdrop-blur-sm',
};

const radiusClasses = {
  lg:  'rounded-lg',
  xl:  'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
};

const paddingClasses = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  radius = '2xl',
  padding = 'md',
  header,
  footer,
  className = '',
  children,
}) => (
  <div className={`overflow-hidden ${variantClasses[variant]} ${radiusClasses[radius]} ${className}`}>
    {header && (
      <div className="px-6 py-4 t-border border-b">{header}</div>
    )}
    {padding !== 'none' ? (
      <div className={paddingClasses[padding]}>{children}</div>
    ) : (
      children
    )}
    {footer && (
      <div className="px-6 py-4 t-border border-t">{footer}</div>
    )}
  </div>
);
