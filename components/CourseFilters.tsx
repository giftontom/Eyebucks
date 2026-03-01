import { X, Filter } from 'lucide-react';

export interface CourseFiltersState {
  type?: 'BUNDLE' | 'MODULE';
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy: string;
}

interface CourseFiltersProps {
  filters: CourseFiltersState;
  onChange: (filters: CourseFiltersState) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * Course filtering sidebar component
 * Allows users to filter courses by type, price, rating, and sort order
 */
export default function CourseFilters({
  filters,
  onChange,
  onClose,
  showCloseButton = false
}: CourseFiltersProps) {

  const updateFilter = (key: keyof CourseFiltersState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onChange({
      sortBy: 'newest'
    });
  };

  const hasActiveFilters = Boolean(
    filters.type || filters.minPrice || filters.maxPrice || filters.minRating
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Clear all button */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="text-sm text-brand-600 hover:text-brand-500 font-medium"
        >
          Clear all filters
        </button>
      )}

      {/* Sort by */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort by
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Course type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Course Type
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              checked={!filters.type}
              onChange={() => updateFilter('type', undefined)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">All Types</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              checked={filters.type === 'MODULE'}
              onChange={() => updateFilter('type', 'MODULE')}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">Single Module</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              checked={filters.type === 'BUNDLE'}
              onChange={() => updateFilter('type', 'BUNDLE')}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">Bundle</span>
          </label>
        </div>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price Range
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="price"
              checked={!filters.minPrice && !filters.maxPrice}
              onChange={() => {
                updateFilter('minPrice', undefined);
                updateFilter('maxPrice', undefined);
              }}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">All Prices</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="price"
              checked={filters.minPrice === 0 && filters.maxPrice === 0}
              onChange={() => {
                updateFilter('minPrice', 0);
                updateFilter('maxPrice', 0);
              }}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">Free</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="price"
              checked={filters.minPrice === 1 && filters.maxPrice === 50000}
              onChange={() => {
                updateFilter('minPrice', 1);
                updateFilter('maxPrice', 50000);
              }}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">Under ₹500</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="price"
              checked={filters.minPrice === 50000 && filters.maxPrice === 100000}
              onChange={() => {
                updateFilter('minPrice', 50000);
                updateFilter('maxPrice', 100000);
              }}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">₹500 - ₹1,000</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="price"
              checked={filters.minPrice === 100000 && !filters.maxPrice}
              onChange={() => {
                updateFilter('minPrice', 100000);
                updateFilter('maxPrice', undefined);
              }}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">Over ₹1,000</span>
          </label>
        </div>
      </div>

      {/* Rating filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Minimum Rating
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="rating"
              checked={!filters.minRating}
              onChange={() => updateFilter('minRating', undefined)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">All Ratings</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="rating"
              checked={filters.minRating === 4}
              onChange={() => updateFilter('minRating', 4)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">⭐ 4.0 & up</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="rating"
              checked={filters.minRating === 3}
              onChange={() => updateFilter('minRating', 3)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <span className="ml-2 text-sm text-gray-700">⭐ 3.0 & up</span>
          </label>
        </div>
      </div>
    </div>
  );
}
