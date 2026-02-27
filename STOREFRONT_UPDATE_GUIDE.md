# Storefront Search & Filter Integration Guide

## Overview

Guide for integrating search and filter functionality into the Storefront page. The Storefront (`pages/Storefront.tsx`) is the public course catalog at route `/`.

---

## Current Architecture

- **Data source:** `coursesApi.getCourses()` from `services/api/courses.api.ts`
- **Query layer:** Supabase PostgREST via `supabase.from('courses').select(...)`
- **Filtering:** Currently client-side via `filterType` state
- **Components available:** `SearchBar`, `CourseFilters`

---

## Adding Search & Filters

### 1. Update State

Replace the simple filter state with URL-synced filter state:

```typescript
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import CourseFilters, { CourseFiltersState } from '../components/CourseFilters';

const [searchParams, setSearchParams] = useSearchParams();
const [courses, setCourses] = useState<Course[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [totalResults, setTotalResults] = useState(0);
const [showFilters, setShowFilters] = useState(false);

const [filters, setFilters] = useState<CourseFiltersState>({
  type: searchParams.get('type') as 'BUNDLE' | 'MODULE' | undefined,
  minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
  maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
  minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
  sortBy: searchParams.get('sortBy') || 'newest',
});

const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
```

### 2. Update API Query

The `coursesApi.getCourses()` currently fetches all published courses. To support server-side filtering, update `services/api/courses.api.ts`:

```typescript
export const coursesApi = {
  async getCourses(params?: {
    search?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: string;
  }): Promise<Course[]> {
    let query = supabase
      .from('courses')
      .select('*, modules(*)')
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null);

    if (params?.search) {
      query = query.ilike('title', `%${params.search}%`);
    }
    if (params?.type) {
      query = query.eq('type', params.type);
    }
    if (params?.minPrice !== undefined) {
      query = query.gte('price', params.minPrice);
    }
    if (params?.maxPrice !== undefined) {
      query = query.lte('price', params.maxPrice);
    }
    if (params?.minRating !== undefined) {
      query = query.gte('rating', params.minRating);
    }

    // Sort
    if (params?.sortBy === 'price_low') {
      query = query.order('price', { ascending: true });
    } else if (params?.sortBy === 'price_high') {
      query = query.order('price', { ascending: false });
    } else if (params?.sortBy === 'rating') {
      query = query.order('rating', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(mapCourse);
  },
};
```

### 3. Fetch with Filters

```typescript
useEffect(() => {
  setIsLoading(true);
  coursesApi.getCourses({
    search: searchQuery || undefined,
    type: filters.type,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    sortBy: filters.sortBy,
  })
    .then((data) => {
      setCourses(data);
      setTotalResults(data.length);
    })
    .catch(console.error)
    .finally(() => setIsLoading(false));
}, [searchQuery, filters]);
```

### 4. Sync Filters to URL

```typescript
useEffect(() => {
  const params: Record<string, string> = {};
  if (searchQuery) params.search = searchQuery;
  if (filters.type) params.type = filters.type;
  if (filters.minPrice !== undefined) params.minPrice = filters.minPrice.toString();
  if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice.toString();
  if (filters.minRating !== undefined) params.minRating = filters.minRating.toString();
  if (filters.sortBy && filters.sortBy !== 'newest') params.sortBy = filters.sortBy;
  setSearchParams(params, { replace: true });
}, [searchQuery, filters, setSearchParams]);
```

### 5. Add UI Components

Add search bar and filter controls above the course grid:

```tsx
<div className="mb-8 space-y-4">
  <div className="flex gap-4">
    <div className="flex-1">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search courses..."
      />
    </div>
    <button
      onClick={() => setShowFilters(!showFilters)}
      className="px-6 py-2 border rounded-lg flex items-center gap-2"
    >
      <Filter className="h-5 w-5" />
      Filters
    </button>
  </div>

  <div className="text-sm text-gray-600">
    Showing {courses.length} courses
    {searchQuery && ` for "${searchQuery}"`}
  </div>
</div>

{showFilters && (
  <CourseFilters
    filters={filters}
    onChange={setFilters}
    onClose={() => setShowFilters(false)}
  />
)}
```

### 6. Remove Old Filter Logic

Remove the old `filterType` state and `filteredCourses` variable. Use `courses` directly in the grid since filtering is now server-side.

---

## Testing

After implementation:

- [ ] Search by course title
- [ ] Filter by course type (BUNDLE / MODULE)
- [ ] Filter by price range
- [ ] Filter by minimum rating
- [ ] Sort by different criteria (newest, price, rating)
- [ ] Clear all filters
- [ ] URL reflects current filters (shareable links)
- [ ] Mobile filter controls work
- [ ] Results count updates correctly
- [ ] Loading states display during filter changes

---

**Last Updated:** February 27, 2026
