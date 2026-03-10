import { useState, useMemo } from 'react';

import { CourseType } from '../types';

import type { Course } from '../types';

export interface StorefrontFilters {
  typeFilter: 'ALL' | CourseType;
  searchQuery: string;
  minRating: number;     // 0 = no filter, 1-5 = minimum rating
  maxPrice: number;      // 0 = no limit, otherwise max price in paise
}

const DEFAULT_FILTERS: StorefrontFilters = {
  typeFilter: 'ALL',
  searchQuery: '',
  minRating: 0,
  maxPrice: 0,
};

export function useStorefrontFilters(courses: Course[]) {
  const [filters, setFilters] = useState<StorefrontFilters>(DEFAULT_FILTERS);

  const setTypeFilter = (typeFilter: StorefrontFilters['typeFilter']) =>
    setFilters(f => ({ ...f, typeFilter }));

  const setSearchQuery = (searchQuery: string) =>
    setFilters(f => ({ ...f, searchQuery }));

  const setMinRating = (minRating: number) =>
    setFilters(f => ({ ...f, minRating }));

  const setMaxPrice = (maxPrice: number) =>
    setFilters(f => ({ ...f, maxPrice }));

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const isFiltered =
    filters.typeFilter !== 'ALL' ||
    filters.searchQuery !== '' ||
    filters.minRating > 0 ||
    filters.maxPrice > 0;

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      if (filters.typeFilter !== 'ALL' && c.type !== filters.typeFilter) { return false; }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) { return false; }
      }
      if (filters.minRating > 0 && (c.rating || 0) < filters.minRating) { return false; }
      if (filters.maxPrice > 0 && c.price > filters.maxPrice) { return false; }
      return true;
    });
  }, [courses, filters]);

  return {
    filters,
    setTypeFilter,
    setSearchQuery,
    setMinRating,
    setMaxPrice,
    clearFilters,
    isFiltered,
    filteredCourses,
  };
}
