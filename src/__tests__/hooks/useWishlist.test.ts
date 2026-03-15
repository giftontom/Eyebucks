import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../../../services/api/wishlist.api', () => ({
  wishlistApi: {
    list: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('../../../components/Toast', () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));
vi.mock('../../../utils/analytics', () => ({
  analytics: { track: vi.fn() },
}));

import { useAuth } from '../../../context/AuthContext';
import { wishlistApi } from '../../../services/api/wishlist.api';
import { useToast } from '../../../components/Toast';
import { useWishlist } from '../../../hooks/useWishlist';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockList = wishlistApi.list as ReturnType<typeof vi.fn>;
const mockAdd = wishlistApi.add as ReturnType<typeof vi.fn>;
const mockRemove = wishlistApi.remove as ReturnType<typeof vi.fn>;
const mockUseToast = useToast as ReturnType<typeof vi.fn>;

describe('useWishlist', () => {
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseToast.mockReturnValue({ showToast });
  });

  it('loads wishlist for authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockList.mockResolvedValue([
      { id: 'w1', courseId: 'c1', createdAt: new Date() },
      { id: 'w2', courseId: 'c2', createdAt: new Date() },
    ]);

    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.wishlistIds.size).toBe(2);
    expect(result.current.isSaved('c1')).toBe(true);
    expect(result.current.isSaved('c99')).toBe(false);
  });

  it('returns empty set when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.wishlistIds.size).toBe(0);
    expect(mockList).not.toHaveBeenCalled();
  });

  it('optimistically adds a course on toggle', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockList.mockResolvedValue([]);
    mockAdd.mockResolvedValue(undefined);

    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.toggle('c1'); });

    expect(result.current.isSaved('c1')).toBe(true);
    expect(mockAdd).toHaveBeenCalledWith('c1');
  });

  it('optimistically removes a course on toggle when already saved', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockList.mockResolvedValue([{ id: 'w1', courseId: 'c1', createdAt: new Date() }]);
    mockRemove.mockResolvedValue(undefined);

    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSaved('c1')).toBe(true);

    await act(async () => { await result.current.toggle('c1'); });

    expect(result.current.isSaved('c1')).toBe(false);
    expect(mockRemove).toHaveBeenCalledWith('c1');
  });

  it('rolls back optimistic update and shows toast on add failure', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockList.mockResolvedValue([]);
    mockAdd.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.toggle('c1'); });

    expect(result.current.isSaved('c1')).toBe(false); // rolled back
    expect(showToast).toHaveBeenCalledWith('Failed to add to wishlist', 'error');
  });

  it('rolls back optimistic update and shows toast on remove failure', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockList.mockResolvedValue([{ id: 'w1', courseId: 'c1', createdAt: new Date() }]);
    mockRemove.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWishlist());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.toggle('c1'); });

    expect(result.current.isSaved('c1')).toBe(true); // rolled back
    expect(showToast).toHaveBeenCalledWith('Failed to remove from wishlist', 'error');
  });

  it('is a no-op when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useWishlist());

    await act(async () => { await result.current.toggle('c1'); });

    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
