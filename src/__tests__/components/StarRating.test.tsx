import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { StarRating } from '../../../components/StarRating';

describe('StarRating', () => {
  it('renders 5 star buttons', () => {
    render(<StarRating value={3} />);
    const stars = screen.getAllByRole('radio');
    expect(stars).toHaveLength(5);
  });

  it('calls onChange when a star is clicked', async () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('4 stars'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('does not call onChange in readonly mode', async () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} readonly />);
    await userEvent.click(screen.getByLabelText('5 stars'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows numeric value when showValue is true', () => {
    render(<StarRating value={4.5} showValue />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('disables buttons in readonly mode', () => {
    render(<StarRating value={3} readonly />);
    screen.getAllByRole('button').forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });
});
