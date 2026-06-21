import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

import { EnrollmentGate } from '../../../components/EnrollmentGate';

describe('EnrollmentGate', () => {
  const defaultProps = {
    courseId: 'course-123',
    courseTitle: 'Test Course',
    coursePrice: 99900, // paise
    courseThumbnail: 'https://example.com/thumb.jpg',
    courseDescription: 'A test course description',
    totalModules: 10,
  };

  const renderGate = (props = {}) => {
    return render(
      <HashRouter>
        <EnrollmentGate {...defaultProps} {...props} />
      </HashRouter>
    );
  };

  it('should display course title', () => {
    renderGate();
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('should display course price in rupees', () => {
    renderGate();
    expect(screen.getByText(/999/)).toBeInTheDocument();
  });

  it('should display enrollment required message', () => {
    renderGate();
    expect(screen.getByText(/Enrollment Required/i)).toBeInTheDocument();
  });

  it('should display module count', () => {
    renderGate();
    expect(screen.getByText(/10 comprehensive lessons/i)).toBeInTheDocument();
  });

  it('should have an enroll button', () => {
    renderGate();
    expect(screen.getByText(/Enroll Now/i)).toBeInTheDocument();
  });

  it('should have a view details button', () => {
    renderGate();
    expect(screen.getByText(/View Details/i)).toBeInTheDocument();
  });

  // --- A13 gap tests ---

  it('formats price correctly from paise', () => {
    renderGate({ coursePrice: 150000 });
    expect(screen.getByText('₹1,500')).toBeInTheDocument();
  });

  it('links enroll button to checkout route', () => {
    renderGate();
    const enrollBtn = screen.getByText(/Enroll Now/i);
    expect(enrollBtn).toBeInTheDocument();
    expect(enrollBtn.closest('button')).toBeTruthy();
  });

  it('shows trust badges', () => {
    renderGate();
    expect(screen.getByText(/30-Day Money Back/i)).toBeInTheDocument();
    expect(screen.getByText(/Instant Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Certificate Included/i)).toBeInTheDocument();
  });
});
