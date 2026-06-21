import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { Card } from '../../../components/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders header and footer', () => {
    render(
      <Card header={<span>Header</span>} footer={<span>Footer</span>}>
        Body
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies glass variant class', () => {
    const { container } = render(<Card variant="glass">Glass</Card>);
    expect(container.firstChild).toHaveClass('backdrop-blur-sm');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="my-custom">Test</Card>);
    expect(container.firstChild).toHaveClass('my-custom');
  });
});
