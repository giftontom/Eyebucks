import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Toast, useToast } from '../../../components/Toast';

describe('Toast component', () => {
  it('renders message text', () => {
    render(<Toast message="Saved successfully!" />);
    expect(screen.getByText('Saved successfully!')).toBeInTheDocument();
  });

  it('renders success variant by default', () => {
    render(<Toast message="Done" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders error variant', () => {
    const { container } = render(<Toast message="Failed" type="error" />);
    expect(container.firstChild).toHaveClass('bg-red-50');
  });

  it('renders info variant', () => {
    const { container } = render(<Toast message="Info" type="info" />);
    expect(container.firstChild).toHaveClass('bg-blue-50');
  });

  it('calls onClose when X button clicked', async () => {
    const onClose = vi.fn();
    render(<Toast message="Dismiss me" onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render close button when onClose not provided', () => {
    render(<Toast message="No close" />);
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });
});

describe('useToast hook', () => {
  it('showToast adds a toast and ToastContainer renders it', async () => {
    const { result } = renderHook(() => useToast());
    const Wrapper = () => { const { ToastContainer } = result.current; return <ToastContainer />; };
    const { rerender } = render(<Wrapper />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => { result.current.showToast('Hello world'); });
    rerender(<Wrapper />);

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('auto-removes toast after duration', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    const Wrapper = () => { const { ToastContainer } = result.current; return <ToastContainer />; };
    const { rerender } = render(<Wrapper />);

    act(() => { result.current.showToast('Temporary', 'info', 1000); });
    rerender(<Wrapper />);
    expect(screen.getByText('Temporary')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1100); });
    rerender(<Wrapper />);
    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('can dismiss toast via ToastContainer close button', async () => {
    const { result } = renderHook(() => useToast());
    const Wrapper = () => { const { ToastContainer } = result.current; return <ToastContainer />; };
    const { rerender } = render(<Wrapper />);

    act(() => { result.current.showToast('Dismiss me', 'error'); });
    rerender(<Wrapper />);

    await userEvent.click(screen.getByLabelText('Close'));
    rerender(<Wrapper />);
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
  });
});
