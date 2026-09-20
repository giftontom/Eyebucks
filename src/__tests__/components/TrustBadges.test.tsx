import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { TrustBadges, assetBadges, ASSET_BADGES } from '../../../components/TrustBadges';

describe('assetBadges — license-truthful third badge', () => {
  it('claims commercial rights ONLY for a commercial license', () => {
    expect(assetBadges('COMMERCIAL').map(b => b.label)).toContain('Commercial-Ready Files');
    expect(assetBadges('PERSONAL').map(b => b.label)).not.toContain('Commercial-Ready Files');
    expect(assetBadges('EXTENDED').map(b => b.label)).not.toContain('Commercial-Ready Files');
  });

  it('labels personal and extended licenses accurately', () => {
    expect(assetBadges('PERSONAL').map(b => b.label)).toContain('Personal-Use License');
    expect(assetBadges('EXTENDED').map(b => b.label)).toContain('Extended License');
  });

  it('never claims course-only perks (certificate / lifetime course access)', () => {
    for (const lic of ['PERSONAL', 'COMMERCIAL', 'EXTENDED', undefined] as const) {
      const labels = assetBadges(lic).map(b => b.label);
      expect(labels).not.toContain('Certificate Included');
      expect(labels).not.toContain('Lifetime Access');
    }
    expect(ASSET_BADGES.map(b => b.label)).not.toContain('Commercial-Ready Files'); // neutral default
  });

  it('renders the personal-use label for a personal asset (real component)', () => {
    render(<TrustBadges badges={assetBadges('PERSONAL')} />);
    expect(screen.getByText('Personal-Use License')).toBeInTheDocument();
    expect(screen.queryByText('Commercial-Ready Files')).not.toBeInTheDocument();
  });
});
