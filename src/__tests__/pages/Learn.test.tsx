import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCoursesApi } = vi.hoisted(() => ({
  mockCoursesApi: { getCourse: vi.fn(), getCourseModules: vi.fn() },
}));

const mockHasAccess = { current: true };
const mockIsAdmin = { current: false };

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'USER', phone_e164: '+911234567890' },
    session: { access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../services/api', () => ({
  coursesApi: mockCoursesApi,
}));

vi.mock('../../../hooks/useAccessControl', () => ({
  useAccessControl: () => ({
    hasAccess: mockHasAccess.current,
    isLoading: false,
    isEnrolled: mockHasAccess.current,
    isAdmin: mockIsAdmin.current,
    checkEnrollment: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useModuleProgress', () => ({
  useModuleProgress: () => ({
    progressPercent: 50,
    lessonCompletionMap: {},
    showCompletionNotification: false,
    pendingResumeRef: { current: 0 },
    checkCompletion: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useMobileGestures', () => ({
  useMobileGestures: () => ({
    doubleTapIndicator: null,
    handleVideoTap: vi.fn(),
    handleKeyDown: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useModuleNotes', () => ({
  useModuleNotes: () => ({ notes: '', setNotes: vi.fn() }),
}));

vi.mock('../../../hooks/useVideoPlayer', () => ({
  useVideoPlayer: () => ({
    isPlaying: false, setIsPlaying: vi.fn(),
    currentTime: 0,
    duration: 300, setDuration: vi.fn(),
    volume: 1, setVolume: vi.fn(),
    isMuted: false, setIsMuted: vi.fn(),
    showControls: true,
    videoError: null,
    playbackRate: 1,
    hlsQuality: null,
    qualityLevels: [],
    selectedQuality: -1,
    showQualityMenu: false, setShowQualityMenu: vi.fn(),
    bufferedEnd: 0,
    seekPreviewTime: null, setSeekPreviewTime: vi.fn(),
    seekPreviewX: 0,
    handlePlayPause: vi.fn(),
    handleTimeUpdateBasic: vi.fn(),
    handleSeek: vi.fn(),
    toggleMute: vi.fn(),
    toggleFullScreen: vi.fn(),
    cycleSpeed: vi.fn(),
    adjustSpeed: vi.fn(),
    handleMouseMove: vi.fn(),
    handleTouchInteraction: vi.fn(),
    togglePiP: vi.fn(),
    handleVideoError: vi.fn(),
    retryVideo: vi.fn(),
    handleQualityChange: vi.fn(),
    handleLevelsLoaded: vi.fn(),
    handleSelectQuality: vi.fn(),
    handleSeekHover: vi.fn(),
  }),
}));

vi.mock('../../../utils/analytics', () => ({
  analytics: { track: vi.fn(), identify: vi.fn() },
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: 'course-123' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../../components/VideoPlayer', () => ({
  VideoPlayer: vi.fn(() => <div data-testid="video-player" />),
}));

vi.mock('../../../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn(), ToastContainer: () => null }),
}));

vi.mock('../../../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
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

// New shape: modules are CHAPTERS, each with a nested lessons array.
// The sidebar renders lesson titles inside expanded chapters, and the
// header shows "{N} Chapters · {M} Lessons".
const mockModules = [
  {
    id: 'ch-1',
    courseId: 'course-123',
    title: 'Chapter 1',
    orderIndex: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lessons: [
      { id: 'l-1', moduleId: 'ch-1', title: 'Lesson 1', duration: '5:00', durationSeconds: 300, videoUrl: '', isFreePreview: false, orderIndex: 1 },
      { id: 'l-2', moduleId: 'ch-1', title: 'Lesson 2', duration: '10:00', durationSeconds: 600, videoUrl: '', isFreePreview: false, orderIndex: 2 },
      { id: 'l-3', moduleId: 'ch-1', title: 'Lesson 3', duration: '8:00', durationSeconds: 480, videoUrl: '', isFreePreview: false, orderIndex: 3 },
    ],
  },
];

describe('Learn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasAccess.current = true;
    mockIsAdmin.current = false;
    mockCoursesApi.getCourse.mockResolvedValue({ course: mockCourse });
    mockCoursesApi.getCourseModules.mockResolvedValue({ modules: mockModules });
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

  it('redirects to course details when user does not have access', async () => {
    mockHasAccess.current = false;
    const { container } = renderLearn();
    // Non-enrolled users are redirected to /course/:id via <Navigate replace />,
    // so the Learn view (video player, sidebar, lesson list) is never mounted.
    await waitFor(() => {
      expect(container.querySelector('[data-testid="video-player"]')).toBeNull();
      expect(screen.queryByText('Lesson 1')).not.toBeInTheDocument();
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

  // --- A12 gap tests ---

  it('renders lesson list in sidebar', async () => {
    renderLearn();
    // The sidebar header shows chapter titles; lessons appear after expand.
    // Chapter 1 is auto-expanded (it contains the default active lesson).
    await waitFor(() => {
      expect(screen.getByText('Chapter 1')).toBeInTheDocument();
      // Lessons inside the expanded chapter are also visible
      expect(screen.getByText('Lesson 1')).toBeInTheDocument();
      expect(screen.getByText('Lesson 2')).toBeInTheDocument();
      expect(screen.getByText('Lesson 3')).toBeInTheDocument();
    });
  });

  it('shows chapter and lesson count in sidebar header', async () => {
    renderLearn();
    await waitFor(() => {
      // Sidebar header: "{N} Chapters · {M} Lessons"
      expect(screen.getByText('1 Chapters · 3 Lessons')).toBeInTheDocument();
    });
  });

  it('shows progress percentage', async () => {
    renderLearn();
    await waitFor(() => {
      expect(screen.getByText('50% Completed')).toBeInTheDocument();
    });
  });

  it('shows "No lessons available" when course has no lessons', async () => {
    // Return chapters with empty lessons arrays — flatLessons will be empty
    mockCoursesApi.getCourseModules.mockResolvedValue({ modules: [
      { id: 'ch-1', courseId: 'course-123', title: 'Chapter 1', orderIndex: 1,
        createdAt: new Date(), updatedAt: new Date(), lessons: [] },
    ]});
    renderLearn();
    await waitFor(() => {
      expect(screen.getByText(/no lessons available/i)).toBeInTheDocument();
    });
  });

  it('renders bundle hub view for BUNDLE type courses', async () => {
    mockCoursesApi.getCourse.mockResolvedValue({
      course: {
        ...mockCourse,
        type: 'BUNDLE',
        // bundledCourses now uses lessonCount (not moduleCount)
        bundledCourses: [{ id: 'bc-1', title: 'Bundled Course 1', description: 'desc', thumbnail: '', lessonCount: 5 }],
      },
    });
    mockCoursesApi.getCourseModules.mockResolvedValue({ modules: [] });
    renderLearn();
    await waitFor(() => {
      expect(screen.getByText('Bundled Course 1')).toBeInTheDocument();
    });
    expect(screen.getByText('5 Lessons')).toBeInTheDocument();
  });

  it('shows personal notes section', async () => {
    renderLearn();
    await waitFor(() => {
      expect(screen.getByText(/personal notes/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/take notes/i)).toBeInTheDocument();
    });
  });
});
