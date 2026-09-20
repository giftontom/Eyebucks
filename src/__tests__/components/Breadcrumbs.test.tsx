import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { Breadcrumbs, useBreadcrumbLabel } from '../../../components/Breadcrumbs';

// Test harness: a page that publishes a dynamic label for a URL segment, the
// way CourseDetails does via useBreadcrumbLabel(id, course.title).
const Publisher: React.FC<{ segment: string; label: string }> = ({ segment, label }) => {
  useBreadcrumbLabel(segment, label);
  return null;
};

const renderAt = (path: string, publish?: { segment: string; label: string }) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      {publish && <Publisher segment={publish.segment} label={publish.label} />}
      <Breadcrumbs />
    </MemoryRouter>,
  );

describe('Breadcrumbs', () => {
  it('renders nothing on the home page', () => {
    const { container } = renderAt('/');
    expect(container.querySelector('nav')).toBeNull();
  });

  it('shows a UUID course by its published title, not the raw id', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    renderAt(`/course/${uuid}`, { segment: uuid, label: 'Part 1 — From Zero to Influencer' });
    // The real title shows...
    expect(screen.getByText('Part 1 — From Zero to Influencer')).toBeInTheDocument();
    // ...and the raw uuid is never rendered as a crumb.
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
  });

  it('hides a UUID segment that has no published label (no raw id crumb)', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    renderAt(`/course/${uuid}`);
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
    // "Course" still shows as a crumb.
    expect(screen.getByText('Course')).toBeInTheDocument();
  });

  it('renders the "Course" crumb as plain text, not a broken /course link', () => {
    renderAt('/course/c4-editing', { segment: 'c4-editing', label: 'Editing 101' });
    const courseCrumb = screen.getByText('Course');
    expect(courseCrumb.closest('a')).toBeNull(); // not a link (no /course route)
    expect(screen.getByText('Editing 101')).toBeInTheDocument();
  });

  it('links intermediate navigable crumbs and marks the last as current', () => {
    renderAt('/assets');
    const home = screen.getByText('Home');
    expect(home.closest('a')).not.toBeNull();
    const last = screen.getByText('Digital Assets');
    expect(last).toHaveAttribute('aria-current', 'page');
  });
});
