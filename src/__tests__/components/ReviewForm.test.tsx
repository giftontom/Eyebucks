import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { ReviewForm } from '../../../components/ReviewForm';

vi.mock('../../../components/StarRating', () => ({
  StarRating: ({ onChange }: { onChange: (v: number) => void }) => (
    <div>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" data-testid={`star-${n}`} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  ),
}));

// Helper: fill a long enough comment via fireEvent (fast) and select a star
function fillForm(rating: number, comment: string) {
  fireEvent.click(screen.getByTestId(`star-${rating}`));
  fireEvent.change(screen.getByLabelText(/your review/i), { target: { value: comment } });
}

describe('ReviewForm', () => {
  const noop = vi.fn();

  it('renders the form with rating and comment fields', () => {
    render(<ReviewForm courseId="c1" onSubmit={noop} />);
    expect(screen.getByLabelText(/your review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument();
  });

  it('shows validation error when no rating selected', async () => {
    render(<ReviewForm courseId="c1" onSubmit={noop} />);
    fireEvent.change(screen.getByLabelText(/your review/i), { target: { value: 'This is a long enough review comment' } });
    fireEvent.submit(screen.getByRole('button', { name: /submit review/i }).closest('form')!);
    await waitFor(() => expect(screen.getByText(/please select a rating/i)).toBeInTheDocument());
  });

  it('shows validation error when comment is too short', async () => {
    render(<ReviewForm courseId="c1" onSubmit={noop} />);
    fillForm(5, 'Too short');
    fireEvent.submit(screen.getByRole('button', { name: /submit review/i }).closest('form')!);
    await waitFor(() => expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument());
  });

  it('calls onSubmit with rating and trimmed comment when valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReviewForm courseId="c1" onSubmit={onSubmit} />);
    fillForm(4, 'This is a valid review with enough characters');
    fireEvent.submit(screen.getByRole('button', { name: /submit review/i }).closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(4, 'This is a valid review with enough characters'));
  });

  it('shows "Update Review" label when isEditing=true', () => {
    render(<ReviewForm courseId="c1" onSubmit={noop} isEditing initialRating={3} initialComment="Initial comment text" />);
    expect(screen.getByRole('button', { name: /update review/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<ReviewForm courseId="c1" onSubmit={noop} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows error from onSubmit rejection', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Server error'));
    render(<ReviewForm courseId="c1" onSubmit={onSubmit} />);
    fillForm(5, 'This is a valid review comment for testing purposes');
    fireEvent.submit(screen.getByRole('button', { name: /submit review/i }).closest('form')!);
    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
  });
});
