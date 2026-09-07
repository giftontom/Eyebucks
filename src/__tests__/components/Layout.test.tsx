import { render, screen, fireEvent } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Layout } from '../../../components/Layout';
import { useSiteSection } from '../../../context/SiteContentContext';
import { createMockUser, createMockAdmin } from '../helpers/mockProviders';

vi.mock('../../../context/SiteContentContext', () => ({
  useSiteSection: vi.fn(() => null),
}));

const siteSectionMock = useSiteSection as unknown as ReturnType<typeof vi.fn>;

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

  // Reported: opening the mobile menu then scrolling left a big blank gap in the
  // middle and the whole thing scrolled as a separate section. Root cause was
  // `h-screen` (100vh = the tall mobile viewport, bigger than the visible area).
  describe('mobile menu overlay', () => {
    beforeEach(() => siteSectionMock.mockReturnValue(null));

    it('sizes to the dynamic viewport and scrolls within itself, not h-screen', () => {
      renderLayout();
      fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
      const dialog = screen.getByRole('dialog', { name: /navigation/i });
      expect(dialog.className).toContain('h-dvh');
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.className).not.toContain('h-screen');
    });
  });

  // Reported: footer blurb + social links were hardcoded, not editable in admin.
  describe('footer brand (editable via settings)', () => {
    beforeEach(() => siteSectionMock.mockReturnValue(null));

    it('shows the built-in tagline when no settings rows exist', () => {
      renderLayout();
      expect(screen.getByText(/Master the art of filmmaking/i)).toBeInTheDocument();
    });

    it('uses the CMS tagline and social URLs when settings rows exist', () => {
      siteSectionMock.mockImplementation((section: string) =>
        section === 'settings'
          ? [
              { id: 's1', section: 'settings', title: 'footer_tagline', body: 'Custom footer blurb.', metadata: {}, orderIndex: 0, isActive: true },
              { id: 's2', section: 'settings', title: 'footer_youtube_url', body: 'https://youtube.com/@custom', metadata: {}, orderIndex: 0, isActive: true },
            ]
          : null,
      );
      renderLayout();
      expect(screen.getByText('Custom footer blurb.')).toBeInTheDocument();
      expect(screen.queryByText(/Master the art of filmmaking/i)).not.toBeInTheDocument();
      const yt = screen.getByLabelText('YouTube') as HTMLAnchorElement;
      expect(yt.getAttribute('href')).toBe('https://youtube.com/@custom');
    });
  });
});
