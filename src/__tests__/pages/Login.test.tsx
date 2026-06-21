import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockUser = { current: null as any };

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser.current,
    loginDev: vi.fn(),
    loginWithGoogle: mockLoginWithGoogle,
    isLoading: false,
  }),
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn() },
}));

import { Login } from '../../../pages/Login';

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.current = null;
    mockLoginWithGoogle.mockResolvedValue(undefined);
  });

  const renderLogin = () =>
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

  it('renders sign in heading', () => {
    renderLogin();
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
  });

  it('renders Google login button', () => {
    renderLogin();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('calls loginWithGoogle on button click', async () => {
    renderLogin();
    await userEvent.click(screen.getByText('Continue with Google'));
    expect(mockLoginWithGoogle).toHaveBeenCalled();
  });

  it('shows error when login fails', async () => {
    mockLoginWithGoogle.mockRejectedValue(new Error('Auth failed'));
    renderLogin();
    await userEvent.click(screen.getByText('Continue with Google'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Auth failed');
    });
  });

  it('redirects when user is already logged in', () => {
    mockUser.current = { id: 'u1', name: 'Test' };
    renderLogin();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows security badge', () => {
    renderLogin();
    expect(screen.getByText(/secure authentication/i)).toBeInTheDocument();
  });

  it('has links to terms and privacy', () => {
    renderLogin();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('has back to homepage link', () => {
    renderLogin();
    expect(screen.getByText('Back to homepage')).toBeInTheDocument();
  });
});
