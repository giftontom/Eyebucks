import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// The card's wishlist heart needs AuthProvider; it is irrelevant to pricing.
vi.mock('../../../components/WishlistButton', () => ({
  WishlistButton: () => null,
}));

import { CourseCard } from '../../../components/CourseCard';
import { showsComparePrice } from '../../../utils/format';

import type { Course } from '../../../types';

const course = (over: Partial<Course> = {}): Course => ({
  id: 'c1',
  slug: 'a-course',
  title: 'A Course',
  description: 'Description',
  price: 299900,          // ₹2,999 — what the student pays
  comparePrice: null,
  thumbnail: '',
  heroVideoId: null,
  type: 'MODULE',
  status: 'PUBLISHED',
  language: 'EN',
  rating: 4.5,
  totalStudents: 10,
  features: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  publishedAt: new Date('2026-01-01'),
  ...over,
});

const renderCard = (c: Course) =>
  render(<MemoryRouter><CourseCard course={c} index={0} /></MemoryRouter>);

describe('showsComparePrice', () => {
  it('shows a compare price that is above the price charged', () => {
    expect(showsComparePrice(299900, 499900)).toBe(true);
  });

  it('hides a null compare price', () => {
    expect(showsComparePrice(299900, null)).toBe(false);
  });

  it('hides an undefined compare price', () => {
    expect(showsComparePrice(299900, undefined)).toBe(false);
  });

  it('hides a compare price equal to the price — that is a 0% discount', () => {
    expect(showsComparePrice(299900, 299900)).toBe(false);
  });

  it('hides a compare price below the price, which would read as a price rise', () => {
    expect(showsComparePrice(299900, 199900)).toBe(false);
  });

  it('hides a zero compare price on a free course rather than showing ₹0 struck through', () => {
    expect(showsComparePrice(0, 0)).toBe(false);
  });
});

describe('CourseCard price display', () => {
  it('renders the offer price on its own when there is no compare price', () => {
    const { container } = renderCard(course());
    expect(screen.getByText('₹2,999')).toBeInTheDocument();
    expect(container.querySelector('.line-through')).toBeNull();
  });

  it('renders both prices when a compare price is set', () => {
    renderCard(course({ comparePrice: 499900 }));
    expect(screen.getByText('₹2,999')).toBeInTheDocument();
    expect(screen.getByText('₹4,999')).toBeInTheDocument();
  });

  it('strikes through the compare price, not the price charged', () => {
    const { container } = renderCard(course({ comparePrice: 499900 }));
    const struck = container.querySelector('.line-through');
    expect(struck).not.toBeNull();
    expect(struck?.textContent).toBe('₹4,999');
  });

  it('ignores a compare price that is not above the price charged', () => {
    const { container } = renderCard(course({ comparePrice: 199900 }));
    expect(container.querySelector('.line-through')).toBeNull();
    expect(screen.queryByText('₹1,999')).not.toBeInTheDocument();
  });
});
