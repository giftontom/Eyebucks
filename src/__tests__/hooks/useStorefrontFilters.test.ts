import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useStorefrontFilters } from '../../../hooks/useStorefrontFilters';

import type { Course } from '../../../types';

const mockCourses: Course[] = [
  {
    id: 'c1', slug: 'intro-react', title: 'Intro to React', description: 'Learn React basics',
    price: 49900, thumbnail: '', type: 'MODULE', status: 'PUBLISHED', rating: 4.5, totalStudents: 100, features: [],
  },
  {
    id: 'c2', slug: 'advanced-ts', title: 'Advanced TypeScript', description: 'Deep dive into TypeScript',
    price: 99900, thumbnail: '', type: 'MODULE', status: 'PUBLISHED', rating: 3.8, totalStudents: 50, features: [],
  },
  {
    id: 'c3', slug: 'full-bundle', title: 'Full Stack Bundle', description: 'Complete bundle',
    price: 149900, thumbnail: '', type: 'BUNDLE', status: 'PUBLISHED', rating: 4.9, totalStudents: 200, features: [],
  },
];

describe('useStorefrontFilters', () => {
  it('should return all courses with default filters', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    expect(result.current.filteredCourses).toHaveLength(3);
    expect(result.current.isFiltered).toBe(false);
  });

  it('should filter by type', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => result.current.setTypeFilter('BUNDLE'));
    expect(result.current.filteredCourses).toHaveLength(1);
    expect(result.current.filteredCourses[0].id).toBe('c3');
    expect(result.current.isFiltered).toBe(true);
  });

  it('should filter by search query (title match)', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => result.current.setSearchQuery('react'));
    expect(result.current.filteredCourses).toHaveLength(1);
    expect(result.current.filteredCourses[0].id).toBe('c1');
  });

  it('should filter by search query (description match)', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => result.current.setSearchQuery('deep dive'));
    expect(result.current.filteredCourses).toHaveLength(1);
    expect(result.current.filteredCourses[0].id).toBe('c2');
  });

  it('should filter by minimum rating', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => result.current.setMinRating(4.5));
    expect(result.current.filteredCourses).toHaveLength(2);
    expect(result.current.filteredCourses.map(c => c.id)).toContain('c1');
    expect(result.current.filteredCourses.map(c => c.id)).toContain('c3');
  });

  it('should filter by max price', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => result.current.setMaxPrice(99900)); // up to ₹999
    expect(result.current.filteredCourses).toHaveLength(2);
    expect(result.current.filteredCourses.map(c => c.id)).not.toContain('c3');
  });

  it('should combine multiple filters', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => {
      result.current.setTypeFilter('MODULE');
      result.current.setMinRating(4);
    });
    expect(result.current.filteredCourses).toHaveLength(1);
    expect(result.current.filteredCourses[0].id).toBe('c1');
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => {
      result.current.setTypeFilter('BUNDLE');
      result.current.setMinRating(4);
    });
    expect(result.current.filteredCourses).toHaveLength(1);

    act(() => result.current.clearFilters());
    expect(result.current.filteredCourses).toHaveLength(3);
    expect(result.current.isFiltered).toBe(false);
  });

  it('should return empty when no courses match', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => result.current.setSearchQuery('xxxxxxxxx'));
    expect(result.current.filteredCourses).toHaveLength(0);
  });

  it('should be case-insensitive in search', () => {
    const { result } = renderHook(() => useStorefrontFilters(mockCourses));
    act(() => result.current.setSearchQuery('REACT'));
    expect(result.current.filteredCourses).toHaveLength(1);
  });
});
