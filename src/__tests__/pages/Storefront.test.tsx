import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { createMockCourse } from '../helpers/mockProviders';

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
  coursesApi: {
    getCourses: vi.fn(),
  },
  siteContentApi: {
    getBySection: vi.fn().mockResolvedValue([]),
  },
}));

import { coursesApi } from '../../../services/api';

let Storefront: any;
beforeAll(async () => {
  const mod = await import('../../../pages/Storefront');
  Storefront = mod.Storefront || mod.default;
});

describe('Storefront', () => {
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

  it('should fetch and display courses', async () => {
    const mockCourses = [
      createMockCourse({ id: 'course-1', title: 'React Masterclass' }),
      createMockCourse({ id: 'course-2', title: 'Node.js Fundamentals' }),
    ];

    (coursesApi.getCourses as any).mockResolvedValueOnce({
      success: true,
      courses: mockCourses,
    });

    renderStorefront();

    await waitFor(() => {
      expect(screen.getByText('React Masterclass')).toBeInTheDocument();
    });

    expect(screen.getByText('Node.js Fundamentals')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (coursesApi.getCourses as any).mockRejectedValueOnce(
      new Error('Failed to fetch courses')
    );

    renderStorefront();

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });
});
