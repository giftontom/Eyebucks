import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Badge, statusToVariant } from '../../../components/Badge';

describe('Badge', () => {
  it('renders with label text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders all variants without throwing', () => {
    const variants = ['success', 'warning', 'danger', 'info', 'brand', 'default', 'outline'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    }
  });

  it('renders sm and md sizes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toBeInTheDocument();
    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders dot indicator when dot=true', () => {
    const { container } = render(<Badge dot>With Dot</Badge>);
    // dot is a small circle span inside the badge
    expect(container.querySelector('span > span')).toBeInTheDocument();
  });

  it('passes through className', () => {
    const { container } = render(<Badge className="extra-class">Test</Badge>);
    expect(container.firstChild).toHaveClass('extra-class');
  });
});

describe('statusToVariant', () => {
  it('maps PUBLISHED to success', () => expect(statusToVariant('PUBLISHED')).toBe('success'));
  it('maps DRAFT to warning', () => expect(statusToVariant('DRAFT')).toBe('warning'));
  it('maps ACTIVE to success', () => expect(statusToVariant('ACTIVE')).toBe('success'));
  it('maps EXPIRED to default', () => expect(statusToVariant('EXPIRED')).toBe('default'));
  it('maps REVOKED to danger', () => expect(statusToVariant('REVOKED')).toBe('danger'));
  it('maps unknown status to default', () => expect(statusToVariant('UNKNOWN')).toBe('default'));
});
