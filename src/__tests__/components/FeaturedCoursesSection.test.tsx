import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetCourses } = vi.hoisted(() => ({ mockGetCourses: vi.fn() }));

vi.mock('../../../services/api', () => ({
  coursesApi: { getCourses: mockGetCourses },
  siteContentApi: { getAllActive: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'EN' }) }));
// The card's wishlist heart needs AuthProvider; irrelevant to layout stability.
vi.mock('../../../components/WishlistButton', () => ({ WishlistButton: () => null }));

import { FeaturedCoursesSection } from '../../../components/sections/FeaturedCoursesSection';
import { SiteContentProvider } from '../../../context/SiteContentContext';

const renderSection = () =>
  render(
    <SiteContentProvider>
      <MemoryRouter><FeaturedCoursesSection /></MemoryRouter>
    </SiteContentProvider>,
  );

const course = (id: string) => ({
  id, slug: id, title: `Course ${id}`, description: 'd', price: 1000, comparePrice: null,
  thumbnail: '', heroVideoId: null, type: 'MODULE', status: 'PUBLISHED', language: 'EN',
  rating: 5, totalStudents: 1, features: [],
  createdAt: new Date(), updatedAt: new Date(), publishedAt: new Date(),
});

describe('FeaturedCoursesSection layout stability', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * The regression this guards. The section previously rendered a full-height
   * skeleton while loading, then unmounted when the query returned no courses
   * — collapsing ~2200px out of the document and pulling the footer up the
   * page after it already looked settled.
   */
  it('renders nothing while loading, so it cannot collapse later', () => {
    mockGetCourses.mockReturnValue(new Promise(() => { /* never resolves */ }));
    const { container } = renderSection();
    expect(container).toBeEmptyDOMElement();
  });

  it('stays empty when the language has no published courses', async () => {
    mockGetCourses.mockResolvedValue({ courses: [] });
    const { container } = renderSection();
    await waitFor(() => expect(mockGetCourses).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('never occupies space and then gives it back', async () => {
    mockGetCourses.mockResolvedValue({ courses: [] });
    const { container } = renderSection();
    const before = container.innerHTML.length;
    await waitFor(() => expect(mockGetCourses).toHaveBeenCalled());
    // empty → empty. It must not have been non-empty at any point.
    expect(before).toBe(0);
    expect(container.innerHTML.length).toBe(0);
  });

  it('renders the section once courses arrive', async () => {
    mockGetCourses.mockResolvedValue({ courses: [course('a'), course('b')] });
    renderSection();
    await waitFor(() => expect(screen.getByText('Course a')).toBeInTheDocument());
  });

  // The section is deliberately non-critical: a failed fetch hides it rather
  // than showing an error band on the homepage. What matters for layout is
  // that it never took up space first.
  it('stays hidden on fetch failure without ever occupying space', async () => {
    mockGetCourses.mockRejectedValue(new Error('boom'));
    const { container } = renderSection();
    await waitFor(() => expect(mockGetCourses).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
