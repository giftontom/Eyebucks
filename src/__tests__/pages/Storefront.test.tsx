import { render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock API modules
vi.mock('../../../services/api', () => ({
  siteContentApi: {
    getBySection: vi.fn().mockResolvedValue([]),
  },
  coursesApi: {
    getCourses: vi.fn().mockResolvedValue({ courses: [], total: 0 }),
    getCourseCount: vi.fn().mockResolvedValue(0),
    getCourseModules: vi.fn().mockResolvedValue({ modules: [], hasAccess: false, success: true }),
  },
}));

let Storefront: any;
beforeAll(async () => {
  const mod = await import('../../../pages/Storefront');
  Storefront = mod.Storefront || mod.default;
});

describe('Storefront (Landing Page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderStorefront = () => {
    return render(
      <HashRouter>
        <Storefront />
      </HashRouter>
    );
  };

  it('should render the hero section with headline', async () => {
    renderStorefront();

    await waitFor(() => {
      expect(screen.getByText('Master the Craft')).toBeInTheDocument();
    });
    expect(screen.getByText('of Filmmaking.')).toBeInTheDocument();
  });

  it('should render closing section with FAQ accordion', async () => {
    renderStorefront();

    await waitFor(() => {
      expect(screen.getByText('Questions, answered. Then start shooting.')).toBeInTheDocument();
    });
    // First default FAQ question is rendered in the accordion
    expect(screen.getByText('Do I need expensive gear to start?')).toBeInTheDocument();
  });

  it('should render final CTA card', async () => {
    renderStorefront();

    await waitFor(() => {
      expect(screen.getByText('Start today.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /get full access/i })).toBeInTheDocument();
  });
});
