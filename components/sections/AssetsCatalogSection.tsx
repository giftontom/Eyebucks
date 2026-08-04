import { Search, X, ChevronDown } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { digitalAssetsApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { AssetCard } from '../AssetCard';
import { CourseCardSkeleton } from '../CourseCardSkeleton';

import type { AssetSort, GetAssetsOptions } from '../../services/api';
import type { AssetFileType, DigitalAsset } from '../../types';

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 300;
const DEFAULT_SORT: AssetSort = 'newest';

type FileTypeFilter = 'ALL' | AssetFileType;

const FILE_TYPE_OPTIONS: { value: FileTypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'LUT', label: 'LUTs' },
  { value: 'PRESET', label: 'Presets' },
  { value: 'SFX', label: 'SFX' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'OVERLAY', label: 'Overlays' },
  { value: 'PROJECT', label: 'Project Files' },
  { value: 'PDF', label: 'PDFs / Guides' },
  { value: 'TEMPLATE', label: 'Templates' },
  { value: 'OTHER', label: 'Other' },
];
const FILE_TYPE_VALUES = FILE_TYPE_OPTIONS.map(o => o.value);

const SORT_OPTIONS: { value: AssetSort; label: string }[] = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];
const SORT_VALUES = SORT_OPTIONS.map(o => o.value);

interface FilterState {
  fileType: FileTypeFilter;
  searchQuery: string;
  sort: AssetSort;
}

function readFilters(params: URLSearchParams): FilterState {
  const typeParam = params.get('type') as FileTypeFilter | null;
  const sortParam = params.get('sort') as AssetSort | null;
  return {
    fileType: typeParam && FILE_TYPE_VALUES.includes(typeParam) ? typeParam : 'ALL',
    searchQuery: params.get('q') || '',
    sort: sortParam && SORT_VALUES.includes(sortParam) ? sortParam : DEFAULT_SORT,
  };
}

function filtersToParams(filters: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.fileType !== 'ALL') { p.set('type', filters.fileType); }
  if (filters.searchQuery) { p.set('q', filters.searchQuery); }
  if (filters.sort !== DEFAULT_SORT) { p.set('sort', filters.sort); }
  return p;
}

function filtersToQuery(filters: FilterState, page: number): GetAssetsOptions {
  return {
    page,
    pageSize: PAGE_SIZE,
    fileType: filters.fileType === 'ALL' ? undefined : filters.fileType,
    search: filters.searchQuery || undefined,
    sort: filters.sort,
  };
}

export const AssetsCatalogSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => readFilters(searchParams));
  const [searchInput, setSearchInput] = useState(filters.searchQuery);

  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  // Debounce the search box into filter state.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => (f.searchQuery === searchInput ? f : { ...f, searchQuery: searchInput }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Keep the URL in sync.
  useEffect(() => {
    const next = filtersToParams(filters);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadAssets = useCallback(() => {
    const loadId = ++loadIdRef.current;
    setLoadError(false);
    if (hasLoadedRef.current) { setIsRefetching(true); } else { setIsLoading(true); }
    digitalAssetsApi.getAssets(filtersToQuery(filters, 1))
      .then(res => {
        if (loadId !== loadIdRef.current) { return; }
        setAssets(res.assets);
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(1);
        hasLoadedRef.current = true;
      })
      .catch(err => {
        if (loadId !== loadIdRef.current) { return; }
        logger.error('[AssetsCatalogSection] Failed to load assets:', err);
        setLoadError(true);
      })
      .finally(() => {
        if (loadId !== loadIdRef.current) { return; }
        setIsLoading(false);
        setIsRefetching(false);
      });
  }, [filters]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    digitalAssetsApi.getAssets(filtersToQuery(filters, nextPage))
      .then(res => {
        setAssets(prev => [...prev, ...res.assets]);
        setHasMore(res.hasMore);
        setPage(nextPage);
      })
      .catch(err => { logger.error('[AssetsCatalogSection] Failed to load more:', err); })
      .finally(() => setIsLoadingMore(false));
  }, [page, filters]);

  const isFiltered = filters.fileType !== 'ALL' || !!filters.searchQuery;

  const clearFilters = () => {
    setFilters({ fileType: 'ALL', searchQuery: '', sort: DEFAULT_SORT });
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  return (
    <section className="py-24 t-bg" id="assets-catalog">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col mb-8 gap-6">
          <div>
            <span className="inline-block px-3 py-1 bg-brand-600/10 border border-brand-600/20 text-brand-400 rounded-full font-bold tracking-wider uppercase text-[10px] mb-3">
              Shop
            </span>
            <h2 className="text-4xl font-bold t-text mb-2 flex items-center gap-3 flex-wrap" style={{ fontFamily: 'var(--font-display)' }}>
              Digital Assets
              {!isLoading && total > 0 && (
                <span className="text-sm font-medium t-text-3 px-2.5 py-1 rounded-full t-bg-alt t-border border">{total}</span>
              )}
            </h2>
            <p className="t-text-2 text-lg">LUTs, presets, sound packs, templates and project files for your craft.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <select
                value={filters.fileType}
                onChange={(e) => setFilters(f => ({ ...f, fileType: e.target.value as FileTypeFilter }))}
                aria-label="Filter by type"
                className="appearance-none t-card t-border border rounded-full pl-4 pr-9 py-2.5 text-sm font-bold t-text-2 hover:border-brand-500/50 cursor-pointer outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                {FILE_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none t-text-3" />
            </div>
            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value as AssetSort }))}
                aria-label="Sort assets"
                className="appearance-none t-card t-border border rounded-full pl-4 pr-9 py-2.5 text-sm font-bold t-text-2 hover:border-brand-500/50 cursor-pointer outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none t-text-3" />
            </div>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 t-text-3" size={20} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search assets..."
            aria-label="Search assets"
            className="w-full pl-12 pr-10 py-3 md:py-4 rounded-2xl t-border border t-input-bg t-text placeholder:t-text-3 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition text-base md:text-lg shadow-sm focus:shadow-md dark:shadow-none"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 t-text-3 hover:t-text transition p-1 rounded-lg hover:bg-[var(--surface-hover)]">
              <X size={20} />
            </button>
          )}
        </div>

        {isFiltered && !isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm t-text-3">
              Showing {assets.length}{total > assets.length ? ` of ${total}` : ''} asset{total !== 1 ? 's' : ''}
            </p>
            <button onClick={clearFilters} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition">Clear all filters</button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : loadError ? (
          <div className="text-center py-16 md:py-24 px-4">
            <h3 className="text-lg md:text-xl font-bold t-text mb-2">Unable to load assets</h3>
            <p className="t-text-2 mb-6 max-w-sm mx-auto">Please check your connection and try again.</p>
            <button onClick={loadAssets} className="bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold px-6 py-2.5 rounded-full transition">Try Again</button>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 md:py-24 px-4">
            {isFiltered ? (
              <>
                <h3 className="text-lg md:text-xl font-bold t-text mb-2">No assets match your search</h3>
                <p className="t-text-2 mb-6 max-w-sm mx-auto">Try adjusting your filters or search terms.</p>
                <button onClick={clearFilters} className="text-brand-400 hover:text-brand-300 font-bold px-6 py-2.5 rounded-full border border-brand-400/50 hover:border-brand-300 transition">Clear Filters</button>
              </>
            ) : (
              <>
                <h3 className="text-lg md:text-xl font-bold t-text mb-2">No assets available yet</h3>
                <p className="t-text-3">Check back soon for new drops!</p>
              </>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-200 ${isRefetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {assets.map((asset, index) => <AssetCard key={asset.id} asset={asset} index={index} />)}
          </div>
        )}

        {!isLoading && !loadError && hasMore && assets.length > 0 && (
          <div className="text-center mt-12 md:mt-16">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-full transition-all duration-200 flex items-center gap-3 mx-auto active:scale-95 shadow-lg shadow-brand-600/30"
            >
              {isLoadingMore ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading more...</span>
                </>
              ) : (
                <span>{total - assets.length} more asset{total - assets.length !== 1 ? 's' : ''}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
