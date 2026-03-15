import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../../../services/api', () => ({
  enrollmentsApi: {
    checkAccess: vi.fn(),
  },
}));

import { useAuth } from '../../../context/AuthContext';
import { enrollmentsApi } from '../../../services/api';
import { useAccessControl } from '../../../hooks/useAccessControl';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockCheckAccess = enrollmentsApi.checkAccess as ReturnType<typeof vi.fn>;

describe('useAccessControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hasAccess=false and isLoading=false when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useAccessControl('course-123'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(false);
    expect(result.current.isEnrolled).toBe(false);
  });

  it('returns hasAccess=true for ADMIN users without checking enrollment', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    const { result } = renderHook(() => useAccessControl('course-123'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(mockCheckAccess).not.toHaveBeenCalled();
  });

  it('returns hasAccess=true when enrollment check passes', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', role: 'USER' } });
    mockCheckAccess.mockResolvedValue(true);
    const { result } = renderHook(() => useAccessControl('course-123'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(true);
    expect(result.current.isEnrolled).toBe(true);
  });

  it('returns hasAccess=false when enrollment check fails', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', role: 'USER' } });
    mockCheckAccess.mockResolvedValue(false);
    const { result } = renderHook(() => useAccessControl('course-123'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(false);
    expect(result.current.isEnrolled).toBe(false);
  });

  it('returns hasAccess=false when enrollment API throws', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', role: 'USER' } });
    mockCheckAccess.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useAccessControl('course-123'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(false);
  });

  it('returns hasAccess=false when courseId is undefined', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', role: 'USER' } });
    const { result } = renderHook(() => useAccessControl(undefined));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(false);
    expect(mockCheckAccess).not.toHaveBeenCalled();
  });
});
