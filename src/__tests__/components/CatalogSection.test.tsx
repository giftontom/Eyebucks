import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CatalogSection } from '../../../components/sections/CatalogSection';

const { mockGetCourses } = vi.hoisted(() => ({ mockGetCourses: vi.fn() }));
vi.mock('../../../services/api', () => ({
  coursesApi: { getCourses: mockGetCourses },
}));

const renderCatalog = (entry = '/courses') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <CatalogSection />
    </MemoryRouter>,
  );

/**
 * Regression guard for U2: an empty catalog must resolve the loading skeletons
 * to an explicit empty state — not shimmer forever.
 */
describe('CatalogSection — empty state (U2)', () => {
  beforeEach(() => {
    mockGetCourses.mockReset();
  });

  it('shows an explicit empty state when there are no courses', async () => {
    mockGetCourses.mockResolvedValue({ courses: [], total: 0, hasMore: false });
    renderCatalog();
    expect(await screen.findByText(/no courses available yet/i)).toBeInTheDocument();
  });

  it('shows a "no match" state (not "none available") when filtered with no results', async () => {
    mockGetCourses.mockResolvedValue({ courses: [], total: 0, hasMore: false });
    renderCatalog('/courses?type=BUNDLE');
    expect(await screen.findByText(/no courses match your search/i)).toBeInTheDocument();
  });
});

/**
 * Server-side filter/sort: the catalog must push filter + sort state down into
 * the query (so it covers the whole catalog), not filter a loaded slice in-memory.
 */
describe('CatalogSection — server-side filter/sort', () => {
  beforeEach(() => {
    mockGetCourses.mockReset();
    mockGetCourses.mockResolvedValue({ courses: [], total: 0, hasMore: false });
  });

  it('passes URL filters + sort to the server query on first load', async () => {
    renderCatalog('/courses?type=BUNDLE&sort=price-asc&rating=4&max=99900&q=cinema');
    await waitFor(() => expect(mockGetCourses).toHaveBeenCalled());
    expect(mockGetCourses).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 12,
        type: 'BUNDLE',
        sort: 'price-asc',
        minRating: 4,
        maxPrice: 99900,
        search: 'cinema',
      }),
    );
  });

  it('refetches with the new sort when the sort dropdown changes', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await waitFor(() => expect(mockGetCourses).toHaveBeenCalled());
    mockGetCourses.mockClear();

    await user.selectOptions(screen.getByLabelText(/sort courses/i), 'rating');

    await waitFor(() =>
      expect(mockGetCourses).toHaveBeenCalledWith(expect.objectContaining({ sort: 'rating', page: 1 })),
    );
  });
});
