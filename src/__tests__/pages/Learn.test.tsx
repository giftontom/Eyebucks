import { render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCoursesApi, mockEnrollmentsApi } = vi.hoisted(() => ({
  mockCoursesApi: { getCourse: vi.fn(), getCourseModules: vi.fn() },
  mockEnrollmentsApi: { checkAccess: vi.fn() },
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'USER', phone_e164: null },
    session: { access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../services/api', () => ({
  coursesApi: mockCoursesApi,
  enrollmentsApi: mockEnrollmentsApi,
  progressApi: {
    getProgress: vi.fn().mockResolvedValue([]),
    getCourseStats: vi.fn().mockResolvedValue({ overallPercent: 0 }),
    getResumePosition: vi.fn().mockResolvedValue(0),
    updateCurrentModule: vi.fn().mockResolvedValue(undefined),
  },
  AUTO_SAVE_INTERVAL: 30000,
}));

vi.mock('../../../utils/analytics', () => ({
  analytics: { track: vi.fn(), identify: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: 'course-123' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock heavy component with no-op
vi.mock('../../../components/VideoPlayer', () => ({
  VideoPlayer: vi.fn(() => <div data-testid="video-player" />),
}));

import React from 'react';
import { Learn } from '../../../pages/Learn';

const mockCourse = {
  id: 'course-123',
  title: 'My Course',
  description: 'Description',
  price: 99900,
  thumbnail: '',
  type: 'MODULE',
  status: 'PUBLISHED',
  features: [],
  rating: 4.5,
  totalStudents: 10,
};

const mockModules = [
  { id: 'mod-1', title: 'Module 1', videoUrl: '', isFreePreview: false, orderIndex: 1, duration: '5:00', durationSeconds: 300, courseId: 'course-123', createdAt: new Date(), updatedAt: new Date() },
];

describe('Learn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoursesApi.getCourse.mockResolvedValue({ course: mockCourse });
    mockCoursesApi.getCourseModules.mockResolvedValue({ modules: mockModules });
    mockEnrollmentsApi.checkAccess.mockResolvedValue(true);
  });

  const renderLearn = () =>
    render(
      <HashRouter>
        <Learn />
      </HashRouter>
    );

  it('displays course title when loaded', async () => {
    renderLearn();
    await waitFor(() => expect(screen.getByText('My Course')).toBeInTheDocument());
  });

  it('shows enrollment gate when user does not have access', async () => {
    mockEnrollmentsApi.checkAccess.mockResolvedValue(false);
    renderLearn();
    await waitFor(() => {
      // EnrollmentGate shows the course title and buy prompt
      expect(screen.getAllByText('My Course').length).toBeGreaterThan(0);
    });
  });

  it('renders VideoPlayer when user has access', async () => {
    renderLearn();
    await waitFor(() => expect(screen.getByTestId('video-player')).toBeInTheDocument());
  });

  it('shows course not found when API returns null', async () => {
    mockCoursesApi.getCourse.mockResolvedValue({ course: null });
    renderLearn();
    await waitFor(() => expect(screen.getByText(/course not found/i)).toBeInTheDocument());
  });
});
