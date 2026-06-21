import { CheckCircle2, Award, Zap, Shield } from 'lucide-react';
import React from 'react';

type Badge = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
};

const DEFAULT_BADGES: Badge[] = [
  { icon: Shield, label: '30-Day Money Back' },
  { icon: Zap, label: 'Instant Access' },
  { icon: Award, label: 'Certificate Included' },
  { icon: CheckCircle2, label: 'Lifetime Access' },
];

interface TrustBadgesProps {
  badges?: Badge[];
  variant?: 'row' | 'grid';
  className?: string;
}

/**
 * Reusable trust signal row.
 * Used on CourseDetails sticky CTA, Checkout (above Pay button), and EnrollmentGate.
 */
export const TrustBadges: React.FC<TrustBadgesProps> = ({
  badges = DEFAULT_BADGES,
  variant = 'row',
  className = '',
}) => {
  const containerCls = variant === 'grid'
    ? 'grid grid-cols-2 sm:grid-cols-4 gap-3'
    : 'flex flex-wrap items-center justify-center gap-x-6 gap-y-3';

  return (
    <div className={`${containerCls} ${className}`}>
      {badges.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-sm t-text-2">
          <Icon size={16} className="text-[color:var(--status-success-text)] flex-shrink-0" />
          <span className="font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
};
TrustBadges.displayName = 'TrustBadges';
