import { CheckCircle2, Award, Zap, Shield, Download, FileCheck } from 'lucide-react';
import React from 'react';

import type { AssetLicense } from '../types';

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

/**
 * Digital assets are a download, not a course: no certificate is issued and
 * "lifetime access" means the file stays in your library, not course access.
 * Claiming either on an asset checkout is simply untrue, so asset surfaces
 * pass these instead.
 */
/** The licensing badge must match the asset's ACTUAL license — claiming
 *  "Commercial-Ready Files" on a PERSONAL asset misrepresents the rights the
 *  buyer receives (and contradicts the license label on the asset page). */
function licenseBadge(license?: AssetLicense): Badge {
  switch (license) {
    case 'COMMERCIAL': return { icon: FileCheck, label: 'Commercial-Ready Files' };
    case 'EXTENDED':   return { icon: FileCheck, label: 'Extended License' };
    case 'PERSONAL':   return { icon: FileCheck, label: 'Personal-Use License' };
    default:           return { icon: FileCheck, label: 'Licensed Download' };
  }
}

/** Trust badges for a digital-asset checkout, with the 3rd badge derived from
 *  the asset's license. Pass the asset's license so the claim is truthful. */
export function assetBadges(license?: AssetLicense): Badge[] {
  return [
    { icon: Zap, label: 'Instant Download' },
    { icon: Download, label: 'Re-download Anytime' },
    licenseBadge(license),
    { icon: Shield, label: 'Secure Checkout' },
  ];
}

/**
 * Digital assets are a download, not a course: no certificate is issued and
 * "lifetime access" means the file stays in your library, not course access.
 * Default asset badges (license-neutral) for surfaces without a known license.
 */
export const ASSET_BADGES: Badge[] = assetBadges(undefined);

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
