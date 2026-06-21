import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockSupabase, authChangeListeners } = vi.hoisted(() => {
  const authChangeListeners: ((event: string, session: unknown) => void | Promise<void>)[] = [];
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        authChangeListeners.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    functions: { invoke: vi.fn() },
    from: vi.fn(),
  };
  return { mockSupabase, authChangeListeners };
});

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));
vi.mock('../../../services/api/users.api', () => ({
  mapUserProfile: (raw: { id: string; email: string; role: string; name?: string }) => ({
    id: raw.id,
    email: raw.email,
    role: raw.role,
    name: raw.name ?? '',
  }),
}));
vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../utils/analytics', () => ({
  analytics: { identify: vi.fn(), reset: vi.fn() },
}));

import { AuthProvider, useAuth } from '../../../context/AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const stubProfileQuery = (profile: unknown, error: unknown = null) => {
  // .from('users').select('*').eq('id', x).single() → {data, error}
  // .from('users').update({...}).eq('id', x)        → {error: null}
  mockSupabase.from.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: profile, error }),
      }),
    }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }));
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeListeners.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finishes loading and exposes no user when no session exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('loads the user profile from an existing session', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    stubProfileQuery({ id: 'user-1', email: 'a@b.com', role: 'USER' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.id).toBe('user-1');
    });
    expect(result.current.user?.email).toBe('a@b.com');
    expect(result.current.isLoading).toBe(false);
  });

  it('treats session-enforce network failure as success (lenient mode)', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockSupabase.functions.invoke.mockResolvedValue({
      error: { message: 'Failed to fetch' }, // network-shaped error
    });
    stubProfileQuery({ id: 'user-2', email: 'c@d.com', role: 'USER' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await authChangeListeners[0]('SIGNED_IN', { user: { id: 'user-2' } });
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('session-enforce');
    expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('signs the user out when session-enforce returns a non-network error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockSupabase.functions.invoke.mockResolvedValue({
      error: { message: 'Session limit exceeded' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await authChangeListeners[0]('SIGNED_IN', { user: { id: 'user-3' } });
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('clears user state on SIGNED_OUT', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-4' } } },
    });
    stubProfileQuery({ id: 'user-4', email: 'e@f.com', role: 'USER' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('user-4'));

    await act(async () => {
      await authChangeListeners[0]('SIGNED_OUT', null);
    });

    expect(result.current.user).toBeNull();
  });

  it('logout calls supabase.auth.signOut and clears state', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-5' } } },
    });
    stubProfileQuery({ id: 'user-5', email: 'g@h.com', role: 'USER' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('user-5'));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('useAuth throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within an AuthProvider/
    );
  });
});
