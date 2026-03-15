import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  useLocation: () => ({ pathname: '/dashboard', search: '' }),
}));
vi.mock('../../../components/PhoneGateModal', () => ({
  PhoneGateModal: () => <div data-testid="phone-gate-modal" />,
}));

import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('ProtectedRoute', () => {
  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    const { container } = render(<ProtectedRoute><div>Protected</div></ProtectedRoute>);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders Navigate redirect when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<ProtectedRoute><div>Protected</div></ProtectedRoute>);
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('uses custom redirectTo prop', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<ProtectedRoute redirectTo="/signin"><div>X</div></ProtectedRoute>);
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/signin');
  });

  it('shows PhoneGateModal and blurred children when user has no phone', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', phone_e164: null }, isLoading: false });
    render(<ProtectedRoute><div>Protected</div></ProtectedRoute>);
    expect(screen.getByTestId('phone-gate-modal')).toBeInTheDocument();
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('renders children when user is authenticated with phone', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', phone_e164: '+15550000000' }, isLoading: false });
    render(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByTestId('phone-gate-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });
});
