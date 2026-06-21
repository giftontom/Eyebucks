import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { CourseCardSkeleton, DashboardSkeleton } from '../../../components/CourseCardSkeleton';

describe('CourseCardSkeleton', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(<CourseCardSkeleton />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('DashboardSkeleton renders 3 card skeletons', () => {
    const { container } = render(<DashboardSkeleton />);
    const pulseCards = container.querySelectorAll('.animate-pulse');
    expect(pulseCards.length).toBeGreaterThanOrEqual(3);
  });
});
