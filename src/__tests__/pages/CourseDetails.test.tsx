import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HashRouter } from 'react-router-dom';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockCoursesApi } = vi.hoisted(() => ({
  mockCoursesApi: { getCourse: vi.fn() },
}));

vi.mock('../../../services/api', () => ({
  coursesApi: mockCoursesApi,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('../../../hooks/useAccessControl', () => ({
  useAccessControl: vi.fn(),
}));

vi.mock('../../../hooks/useVideoUrl', () => ({
  useVideoUrl: vi.fn().mockReturnValue({ videoUrl: null, hlsUrl: null, isLoading: false, error: null, refreshUrl: vi.fn() }),
}));

vi.mock('../../../utils/analytics', () => ({
  analytics: { track: vi.fn() },
}));

// Stub heavy / DOM-incompatible components
vi.mock('../../../components/ReviewList', () => ({
  ReviewList: () => <div data-testid="review-list" />,
}));
vi.mock('../../../components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../components')>();
  return {
    ...actual,
    WishlistButton: () => <button data-testid="wishlist-btn" />,
    ShareButton: () => <button data-testid="share-btn" />,
  };
});
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: any) => <>{children}</>,
  HelmetProvider: ({ children }: any) => <>{children}</>,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { useAuth } from '../../../context/AuthContext';
import { useAccessControl } from '../../../hooks/useAccessControl';
import { analytics } from '../../../utils/analytics';
import { CourseDetails } from '../../../pages/CourseDetails';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseAccessControl = useAccessControl as ReturnType<typeof vi.fn>;

function renderPage() {
  return render(
    <HashRouter>
      <CourseDetails />
    </HashRouter>
  );
}

const mockCourse = {
  id: 'course-1',
  slug: 'test-course',
  title: 'Test Course',
  description: 'A great course',
  type: 'MODULE',
  status: 'PUBLISHED',
  price: 99900,
  rating: 4.5,
  totalStudents: 100,
  thumbnail: '',
  heroVideoId: null,
  features: ['Feature A', 'Feature B'],
  chapters: [
    { id: 'ch-1', title: 'Chapter 1', duration: '10:00', orderIndex: 0 },
  ],
  bundledCourses: [],
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default: logged-in, non-enrolled, non-admin
  mockUseAuth.mockReturnValue({ user: { id: 'u1', name: 'Alice' }, login: vi.fn() });
  mockUseAccessControl.mockReturnValue({ hasAccess: false, isLoading: false, isEnrolled: false, isAdmin: false });
  mockCoursesApi.getCourse.mockResolvedValue({ success: true, course: mockCourse });

  // Stub useParams to always return id = 'course-1'
  vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
      ...actual,
      useParams: () => ({ id: 'course-1' }),
      useNavigate: () => vi.fn(),
    };
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CourseDetails', () => {

  it('displays course title and type badge after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Test Course')).toBeInTheDocument());
    expect(screen.getByText('MODULE')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching course', () => {
    mockCoursesApi.getCourse.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state with "Try Again" button on API failure', async () => {
    mockCoursesApi.getCourse.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => expect(screen.getByText('Failed to load course')).toBeInTheDocument());
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retries fetch when "Try Again" is clicked', async () => {
    mockCoursesApi.getCourse
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true, course: mockCourse });

    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /try again/i }));
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(screen.getByText('Test Course')).toBeInTheDocument());
    expect(mockCoursesApi.getCourse).toHaveBeenCalledTimes(2);
  });

  it('shows error state when API rejects with "Course not found"', async () => {
    mockCoursesApi.getCourse.mockRejectedValue(new Error('Course not found'));
    renderPage();
    await waitFor(() => expect(screen.getByText('Failed to load course')).toBeInTheDocument());
    expect(screen.getByText('Course not found')).toBeInTheDocument();
  });

  it('fires course_viewed analytics event on successful load', async () => {
    renderPage();
    await waitFor(() => expect(analytics.track).toHaveBeenCalledWith(
      'course_viewed',
      expect.objectContaining({ course_id: 'course-1', course_title: 'Test Course' })
    ));
  });

  // ─── CTA button logic ──────────────────────────────────────────────────────

  it('shows "Enroll Now" CTA for logged-in non-enrolled user', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    // Sidebar CTA shows text without price; mobile CTA shows with price
    expect(screen.getAllByText(/enroll now/i).length).toBeGreaterThan(0);
  });

  it('shows "Login to Enroll" CTA for unauthenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: null, login: vi.fn() });
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    expect(screen.getAllByText(/login to enroll/i).length).toBeGreaterThan(0);
  });

  it('calls login() when unauthenticated user clicks CTA', async () => {
    const loginFn = vi.fn();
    mockUseAuth.mockReturnValue({ user: null, login: loginFn });
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    // Click the sidebar CTA
    fireEvent.click(screen.getAllByText(/login to enroll/i)[0]);
    await waitFor(() => expect(loginFn).toHaveBeenCalled());
  });

  it('shows "Continue Learning" CTA for enrolled user', async () => {
    mockUseAccessControl.mockReturnValue({ hasAccess: true, isLoading: false, isEnrolled: true, isAdmin: false });
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    expect(screen.getAllByText(/continue learning/i).length).toBeGreaterThan(0);
  });

  it('shows "You\'re enrolled" badge for enrolled user', async () => {
    mockUseAccessControl.mockReturnValue({ hasAccess: true, isLoading: false, isEnrolled: true, isAdmin: false });
    renderPage();
    await waitFor(() => expect(screen.getByText(/you're enrolled/i)).toBeInTheDocument());
  });

  it('shows "Loading..." CTA while access check is in progress', async () => {
    mockUseAccessControl.mockReturnValue({ hasAccess: false, isLoading: true, isEnrolled: false, isAdmin: false });
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);
  });

  // ─── Tab switching ─────────────────────────────────────────────────────────

  it('switches to CURRICULUM tab and shows chapter list', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    fireEvent.click(screen.getByRole('button', { name: 'CURRICULUM' }));
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
  });

  it('shows locked content message when non-enrolled user expands a chapter', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    fireEvent.click(screen.getByRole('button', { name: 'CURRICULUM' }));
    fireEvent.click(screen.getByText('Chapter 1'));
    expect(screen.getByText(/enroll to unlock/i)).toBeInTheDocument();
  });

  it('shows REVIEWS tab and renders ReviewList', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    fireEvent.click(screen.getByRole('button', { name: 'REVIEWS' }));
    expect(screen.getByTestId('review-list')).toBeInTheDocument();
  });

  // ─── Bundle course ─────────────────────────────────────────────────────────

  it('shows INCLUDED COURSES tab for BUNDLE type course', async () => {
    mockCoursesApi.getCourse.mockResolvedValue({
      success: true,
      course: {
        ...mockCourse,
        type: 'BUNDLE',
        bundledCourses: [
          { id: 'bc-1', title: 'Bundled Course 1', description: 'desc', price: 49900, rating: 4, totalStudents: 50, thumbnail: '', moduleCount: 5 },
        ],
      },
    });
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    expect(screen.getByText(/included courses/i)).toBeInTheDocument();
    // CURRICULUM tab should NOT be visible for bundles
    expect(screen.queryByRole('button', { name: 'CURRICULUM' })).not.toBeInTheDocument();
  });

  it('shows bundled course titles in COURSES tab', async () => {
    mockCoursesApi.getCourse.mockResolvedValue({
      success: true,
      course: {
        ...mockCourse,
        type: 'BUNDLE',
        bundledCourses: [
          { id: 'bc-1', title: 'Bundled Course 1', description: 'desc', price: 49900, rating: 4, totalStudents: 50, thumbnail: '', moduleCount: 5 },
        ],
      },
    });
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    fireEvent.click(screen.getByRole('button', { name: /included courses/i }));
    // Title appears in both main tab area and sidebar list
    expect(screen.getAllByText('Bundled Course 1').length).toBeGreaterThan(0);
  });

  it('shows savings banner when bundle price is less than sum of individual courses', async () => {
    mockCoursesApi.getCourse.mockResolvedValue({
      success: true,
      course: {
        ...mockCourse,
        type: 'BUNDLE',
        price: 99900, // ₹999
        bundledCourses: [
          { id: 'bc-1', title: 'Course A', description: '', price: 79900, rating: 4, totalStudents: 10, thumbnail: '', moduleCount: 3 },
          { id: 'bc-2', title: 'Course B', description: '', price: 79900, rating: 4, totalStudents: 10, thumbnail: '', moduleCount: 3 },
        ],
      },
    });
    renderPage();
    await waitFor(() => screen.getByText('Test Course'));
    fireEvent.click(screen.getByRole('button', { name: /included courses/i }));
    expect(screen.getByText(/save ₹/i)).toBeInTheDocument();
  });
});
