import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockToggle = vi.fn();
const mockIsSaved = vi.fn();
const mockLogin = vi.fn();
const mockUser = { current: { id: 'u1', name: 'Test' } as any };

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current, login: mockLogin }),
}));

vi.mock('../../../hooks/useWishlist', () => ({
  useWishlist: () => ({ isSaved: mockIsSaved, toggle: mockToggle }),
}));

import { WishlistButton } from '../../../components/WishlistButton';

describe('WishlistButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSaved.mockReturnValue(false);
    mockUser.current = { id: 'u1', name: 'Test' };
  });

  it('renders with "Save to wishlist" label when not saved', () => {
    render(<WishlistButton courseId="c1" />);
    expect(screen.getByLabelText('Save to wishlist')).toBeInTheDocument();
  });

  it('renders with "Remove from wishlist" label when saved', () => {
    mockIsSaved.mockReturnValue(true);
    render(<WishlistButton courseId="c1" />);
    expect(screen.getByLabelText('Remove from wishlist')).toBeInTheDocument();
  });

  it('calls toggle on click when user is authenticated', async () => {
    render(<WishlistButton courseId="c1" />);
    await userEvent.click(screen.getByRole('button'));
    expect(mockToggle).toHaveBeenCalledWith('c1');
  });

  it('calls login when user is not authenticated', async () => {
    mockUser.current = null;
    render(<WishlistButton courseId="c1" />);
    await userEvent.click(screen.getByRole('button'));
    expect(mockLogin).toHaveBeenCalled();
    expect(mockToggle).not.toHaveBeenCalled();
  });
});
