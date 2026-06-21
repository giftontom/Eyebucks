import { Search, X, SlidersHorizontal, Star, ChevronDown } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CourseCard } from '../CourseCard';
import { CourseCardSkeleton } from '../CourseCardSkeleton';
import { coursesApi } from '../../services/api';
import { formatPrice } from '../../utils/format';
import { logger } from '../../utils/logger';

import type { CourseSort, GetCoursesOptions } from '../../services/api';
import type { Course } from '../../types';

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 300;
const DEFAULT_SORT: CourseSort = 'newest';

type TypeFilter = 'ALL' | 'BUNDLE' | 'MODULE';

interface FilterState {
  typeFilter: TypeFilter;
  searchQuery: string;
  minRating: number;
  maxPrice: number;
  sort: CourseSort;
}

const SORT_OPTIONS: { value: CourseSort; label: string }[] = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const SORT_VALUES = SORT_OPTIONS.map(o => o.value);

function readFiltersFromParams(params: URLSearchParams): FilterState {
  const sortParam = params.get('sort') as CourseSort | null;
  return {
    typeFilter: (params.get('type') as TypeFilter) || 'ALL',
    searchQuery: params.get('q') || '',
    minRating: Number(params.get('rating')) || 0,
    maxPrice: Number(params.get('max')) || 0,
    sort: sortParam && SORT_VALUES.includes(sortParam) ? sortParam : DEFAULT_SORT,
  };
}

function filtersToParams(filters: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.typeFilter !== 'ALL') p.set('type', filters.typeFilter);
  if (filters.searchQuery) p.set('q', filters.searchQuery);
  if (filters.minRating > 0) p.set('rating', String(filters.minRating));
  if (filters.maxPrice > 0) p.set('max', String(filters.maxPrice));
  if (filters.sort !== DEFAULT_SORT) p.set('sort', filters.sort);
  return p;
}

/** Map the UI filter state to the server-side query options. */
function filtersToQuery(filters: FilterState, page: number): GetCoursesOptions {
  return {
    page,
    pageSize: PAGE_SIZE,
    type: filters.typeFilter === 'ALL' ? undefined : filters.typeFilter,
    search: filters.searchQuery || undefined,
    minRating: filters.minRating || undefined,
    maxPrice: filters.maxPrice || undefined,
    sort: filters.sort,
  };
}

export const CatalogSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromParams(searchParams));
  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Guards against out-of-order responses when filters change rapidly.
  const loadIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  // Debounce the search input into the filter state.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => (f.searchQuery === searchInput ? f : { ...f, searchQuery: searchInput }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Keep the URL in sync with the active filters (replace, no history spam).
  useEffect(() => {
    const next = filtersToParams(filters);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // (Re)load page 1 whenever the filters change. Server-side filter/sort means
  // the result set already reflects the whole catalog, not just a loaded slice.
  const loadCourses = useCallback(() => {
    const loadId = ++loadIdRef.current;
    setLoadError(false);
    if (hasLoadedRef.current) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    coursesApi.getCourses(filtersToQuery(filters, 1))
      .then(res => {
        if (loadId !== loadIdRef.current) return; // a newer request superseded this one
        setCourses(res.courses);
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(1);
        hasLoadedRef.current = true;
      })
      .catch(err => {
        if (loadId !== loadIdRef.current) return;
        logger.error('[CatalogSection] Failed to load courses:', err);
        setLoadError(true);
      })
      .finally(() => {
        if (loadId !== loadIdRef.current) return;
        setIsLoading(false);
        setIsRefetching(false);
      });
  }, [filters]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    coursesApi.getCourses(filtersToQuery(filters, nextPage))
      .then(res => {
        setCourses(prev => [...prev, ...res.courses]);
        setHasMore(res.hasMore);
        setPage(nextPage);
      })
      .catch(err => { logger.error('[CatalogSection] Failed to load more courses:', err); })
      .finally(() => setIsLoadingMore(false));
  }, [page, filters]);

  const isFiltered = filters.typeFilter !== 'ALL' || !!filters.searchQuery || filters.minRating > 0 || filters.maxPrice > 0;

  const updateFilter = (partial: Partial<FilterState>) => {
    setFilters(f => ({ ...f, ...partial }));
  };

  const clearFilters = () => {
    setFilters({ typeFilter: 'ALL', searchQuery: '', minRating: 0, maxPrice: 0, sort: DEFAULT_SORT });
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  return (
    <section className="py-24 t-bg" id="catalog">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col mb-8 gap-6">
          <div>
            <span className="inline-block px-3 py-1 bg-brand-600/10 border border-brand-600/20 text-brand-400 rounded-full font-bold tracking-wider uppercase text-[10px] mb-3">
              Catalog
            </span>
            <h2 className="text-4xl font-bold t-text mb-2 flex items-center gap-3 flex-wrap" style={{ fontFamily: 'var(--font-display)' }}>
              Masterclass Catalog
              {!isLoading && total > 0 && (
                <span className="text-sm font-medium t-text-3 px-2.5 py-1 rounded-full t-bg-alt t-border border">
                  {total}
                </span>
              )}
            </h2>
            <p className="t-text-2 text-lg">Choose your path. From cinematography to color grading.</p>
          </div>
          {/* Desktop: Horizontal filters layout */}
          <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
            {/* Type pill filters */}
            <div className="inline-flex t-card p-1 rounded-full t-border border">
              {(['ALL', 'BUNDLE', 'MODULE'] as const).map(type => {
                const isActive = filters.typeFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => updateFilter({ typeFilter: type })}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-(--shadow-brand)'
                        : 't-text-3 hover:t-text hover:bg-(--surface-hover)'
                    }`}
                  >
                    {type === 'ALL' ? 'All' : type === 'BUNDLE' ? 'Bundles' : 'Modules'}
                  </button>
                );
              })}
            </div>
            {/* Sort + advanced filters */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => updateFilter({ sort: e.target.value as CourseSort })}
                  aria-label="Sort courses"
                  className="appearance-none t-card t-border border rounded-full pl-4 pr-9 py-2.5 text-sm font-bold t-text-2 hover:border-brand-500/50 cursor-pointer outline-none focus:ring-2 focus:ring-brand-500 transition whitespace-nowrap"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none t-text-3" />
              </div>
              {/* Advanced filter toggle */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                aria-expanded={showAdvanced}
                aria-label="Toggle advanced filters"
                className={`shrink-0 p-2.5 rounded-full t-card border transition ${showAdvanced ? 'text-brand-400 border-brand-500/40 bg-brand-500/10' : 't-border t-text-2 hover:border-brand-500/50'}`}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>
          {/* Mobile: Stacked layout */}
          <div className="md:hidden flex flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(['ALL', 'BUNDLE', 'MODULE'] as const).map(type => {
                const isActive = filters.typeFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => updateFilter({ typeFilter: type })}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-(--shadow-brand)'
                        : 't-text-3 t-card t-border border hover:t-text'
                    }`}
                  >
                    {type === 'ALL' ? 'All' : type === 'BUNDLE' ? 'Bundles' : 'Modules'}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={filters.sort}
                  onChange={(e) => updateFilter({ sort: e.target.value as CourseSort })}
                  aria-label="Sort order"
                  className="w-full appearance-none t-card t-border border rounded-2xl pl-4 pr-9 py-2.5 text-sm font-bold t-text-2 outline-none focus:ring-2 focus:ring-brand-500 transition"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none t-text-3" />
              </div>
              <button
                onClick={() => setShowAdvanced(v => !v)}
                aria-expanded={showAdvanced}
                aria-label="Toggle advanced filters"
                className={`p-2.5 rounded-2xl border transition ${showAdvanced ? 'text-brand-400 border-brand-500/40 bg-brand-500/10' : 't-border t-text-2 t-card'}`}
              >
                <SlidersHorizontal size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 t-text-3" size={20} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search courses..."
            aria-label="Search courses"
            className="w-full pl-12 pr-10 py-3 md:py-4 rounded-2xl t-border border t-input-bg t-text placeholder:t-text-3 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition text-base md:text-lg shadow-sm focus:shadow-md dark:shadow-none"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 t-text-3 hover:t-text transition p-1 rounded-lg hover:bg-[var(--surface-hover)]">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Advanced filters panel */}
        {showAdvanced && (
          <div className="t-card t-border border rounded-2xl p-5 md:p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-fade-in">
            <div>
              <label className="block text-sm md:text-base font-bold t-text mb-4 flex items-center justify-between">
                <span>Minimum Rating</span>
                <span className="text-xs font-medium t-text-3">{filters.minRating > 0 ? `${filters.minRating}★` : 'Any'}</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {[0, 3, 4, 4.5].map(r => (
                  <button
                    key={r}
                    onClick={() => updateFilter({ minRating: r })}
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 ${
                      filters.minRating === r
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 scale-105'
                        : 't-card t-border border t-text-2 hover:border-brand-500/50 active:scale-95'
                    }`}
                  >
                    {r === 0 ? 'Any' : <><Star size={12} fill="currentColor" className="text-yellow-400" /> {r}+</>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm md:text-base font-bold t-text mb-4 flex items-center justify-between">
                <span>Maximum Price</span>
                <span className="text-xs font-medium t-text-3">{filters.maxPrice > 0 ? formatPrice(filters.maxPrice) : 'Any'}</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {[0, 49900, 99900, 199900].map(p => (
                  <button
                    key={p}
                    onClick={() => updateFilter({ maxPrice: p })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 ${
                      filters.maxPrice === p
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 scale-105'
                        : 't-card t-border border t-text-2 hover:border-brand-500/50 active:scale-95'
                    }`}
                  >
                    {p === 0 ? 'Any' : `≤${formatPrice(p)}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isFiltered && !isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm t-text-3">
              Showing {courses.length}{total > courses.length ? ` of ${total}` : ''} course{total !== 1 ? 's' : ''}
            </p>
            <button onClick={clearFilters} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition">
              Clear all filters
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-16 md:py-24 px-4">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-status-danger-bg/20 flex items-center justify-center">
                <svg className="w-8 h-8 t-text-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-bold t-text mb-2">Unable to load courses</h3>
            <p className="t-text-2 mb-6 max-w-sm mx-auto">Please check your connection and try again.</p>
            <button onClick={loadCourses} className="bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold px-6 py-2.5 rounded-full transition">
              Try Again
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 md:py-24 px-4">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-status-info-bg/20 flex items-center justify-center">
                <svg className="w-8 h-8 t-text-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {isFiltered ? (
              <>
                <h3 className="text-lg md:text-xl font-bold t-text mb-2">No courses match your search</h3>
                <p className="t-text-2 mb-6 max-w-sm mx-auto">Try adjusting your filters or search terms.</p>
                <button onClick={clearFilters} className="text-brand-400 hover:text-brand-300 font-bold px-6 py-2.5 rounded-full border border-brand-400/50 hover:border-brand-300 transition">
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg md:text-xl font-bold t-text mb-2">No courses available yet</h3>
                <p className="t-text-3">Check back soon for new content!</p>
              </>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-200 ${isRefetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {courses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        )}

        {!isLoading && !loadError && hasMore && courses.length > 0 && (
          <div className="text-center mt-12 md:mt-16">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-full transition-all duration-200 flex items-center gap-3 mx-auto active:scale-95 shadow-lg shadow-brand-600/30 hover:shadow-lg hover:shadow-brand-500/40"
            >
              {isLoadingMore ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading more...</span>
                </>
              ) : (
                <>
                  <span>{total - courses.length} more course{total - courses.length !== 1 ? 's' : ''}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
