import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Input } from '../../../components/Input';

describe('Input', () => {
  it('renders a basic input', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('renders with label and associates via htmlFor', () => {
    render(<Input label="Email Address" />);
    const label = screen.getByText('Email Address');
    expect(label.tagName).toBe('LABEL');
    const input = screen.getByRole('textbox');
    expect(input.id).toContain('email-address');
  });

  it('shows error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('shows hint when no error', () => {
    render(<Input hint="Use your work email" />);
    expect(screen.getByText('Use your work email')).toBeInTheDocument();
  });

  it('does not show hint when error is present', () => {
    render(<Input error="Required" hint="Use your work email" />);
    expect(screen.queryByText('Use your work email')).not.toBeInTheDocument();
  });

  it('renders all sizes without throwing', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const size of sizes) {
      const { unmount } = render(<Input size={size} placeholder={size} />);
      expect(screen.getByPlaceholderText(size)).toBeInTheDocument();
      unmount();
    }
  });

  it('renders leading and trailing icons', () => {
    render(
      <Input
        leadingIcon={<span data-testid="lead" />}
        trailingIcon={<span data-testid="trail" />}
      />
    );
    expect(screen.getByTestId('lead')).toBeInTheDocument();
    expect(screen.getByTestId('trail')).toBeInTheDocument();
  });

  it('calls onChange handler', async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop passed', () => {
    render(<Input disabled placeholder="disabled" />);
    expect(screen.getByPlaceholderText('disabled')).toBeDisabled();
  });

  it('uses explicit id when provided instead of generated one', () => {
    render(<Input id="my-input" label="Field" />);
    expect(screen.getByRole('textbox').id).toBe('my-input');
  });
});
