import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { CreatorsSection } from '../../../components/CreatorsSection';

describe('CreatorsSection', () => {
  it('renders default cards when no items provided', () => {
    render(<CreatorsSection />);
    expect(screen.getByText('Brand Deal Ready')).toBeInTheDocument();
    expect(screen.getByText('Content Strategy')).toBeInTheDocument();
    expect(screen.getByText('Media Kit & Contracts')).toBeInTheDocument();
    expect(screen.getByText('Monetisation Blueprint')).toBeInTheDocument();
  });

  it('renders custom items from CMS', () => {
    const items = [
      { id: '1', title: 'Custom Card', body: 'Custom body', section: 'showcase' as const, metadata: { icon: 'camera' }, orderIndex: 0, isActive: true },
    ];
    render(<CreatorsSection items={items} />);
    expect(screen.getByText('Custom Card')).toBeInTheDocument();
    expect(screen.getByText('Custom body')).toBeInTheDocument();
  });

  it('renders section heading', () => {
    render(<CreatorsSection />);
    expect(screen.getByText(/built for creators who get paid/i)).toBeInTheDocument();
  });
});
