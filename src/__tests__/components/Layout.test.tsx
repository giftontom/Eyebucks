import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { Layout } from '../../../components/Layout';
import { createMockUser, createMockAdmin } from '../helpers/mockProviders';

// Variable to control auth mock per test
let mockAuthState: any = {
  user: null,
  session: null,
  isLoading: false,
};

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }: any) => children,
}));

describe('Layout', () => {
  const renderLayout = (isAuthenticated = false, user: any = null) => {
    mockAuthState = {
      user: isAuthenticated ? user : null,
      session: isAuthenticated ? { access_token: 'mock-token' } : null,
      isLoading: false,
    };

    return render(
      <HashRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </HashRouter>
    );
  };

  it('should render children content', () => {
    renderLayout();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display logo and brand name', () => {
    renderLayout();
    expect(screen.getAllByText(/eyebuckz/i).length).toBeGreaterThan(0);
  });

  it('should show login button when not authenticated', () => {
    renderLayout(false);
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should show user info when authenticated', () => {
    const user = createMockUser();
    renderLayout(true, user);
    // User name or avatar should be present
    expect(screen.getByText(user.name) || screen.getByAltText(/avatar/i)).toBeInTheDocument();
  });

  it('should show admin link for admin users', () => {
    const admin = createMockAdmin();
    renderLayout(true, admin);
    expect(screen.getAllByText(/admin/i).length).toBeGreaterThan(0);
  });
});
