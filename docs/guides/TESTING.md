# Eyebuckz LMS -- Testing Guide

> Last updated: March 3, 2026

This guide covers the testing infrastructure, conventions, and patterns used in the Eyebuckz LMS project. It is intended for contributors writing new tests or maintaining existing ones.

---

## Table of Contents

1. [Testing Stack](#1-testing-stack)
2. [Running Tests](#2-running-tests)
3. [Test File Organization](#3-test-file-organization)
4. [Setup File](#4-setup-file)
5. [Test Catalog](#5-test-catalog)
6. [Mocking Patterns](#6-mocking-patterns)
7. [Writing New Tests](#7-writing-new-tests)
8. [Coverage](#8-coverage)
9. [Best Practices](#9-best-practices)

---

## 1. Testing Stack

| Tool | Version | Purpose |
|------|---------|---------|
| [Vitest](https://vitest.dev/) | ^4.0.18 | Test runner and assertion library (Vite-native, Jest-compatible API) |
| [jsdom](https://github.com/jsdom/jsdom) | ^27.4.0 | Simulated browser DOM environment for tests |
| [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) | ^16.3.2 | React component rendering and querying utilities |
| [@testing-library/user-event](https://testing-library.com/docs/user-event/intro/) | ^14.6.1 | Simulates realistic user interactions (click, type, etc.) |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) | ^6.9.1 | Custom DOM matchers (e.g., `toBeInTheDocument()`, `toHaveTextContent()`) |
| [@vitest/ui](https://vitest.dev/guide/ui.html) | ^4.0.18 | Browser-based test dashboard UI |

### Configuration files

- **`vitest.config.ts`** -- Standalone Vitest config (separate from `vite.config.ts`). Defines the test environment, setup file, coverage settings, and path aliases.
- **`src/__tests__/setup.ts`** -- Global test setup executed before every test file.

---

## 2. Running Tests

### Basic commands

```bash
# Run all tests in watch mode (re-runs on file change)
npm test

# Run tests with the Vitest browser UI (opens at http://localhost:51204/__vitest__/)
npm run test:ui

# Run tests with code coverage report
npm run test:coverage
```

### Useful flags

```bash
# Run a specific test file
npx vitest src/__tests__/services/checkoutApi.test.ts

# Run tests matching a name pattern
npx vitest --testNamePattern="should fetch signed URL"

# Run tests once (no watch mode, good for CI)
npx vitest run

# Run in verbose mode
npx vitest --reporter=verbose
```

### Filtering in watch mode

When `npm test` is running in watch mode, press:
- `p` to filter by filename
- `t` to filter by test name
- `a` to re-run all tests
- `q` to quit

---

## 3. Test File Organization

### Directory structure

```
src/
  __tests__/
    setup.ts                          # Global test setup
    helpers/
      mockProviders.tsx               # Mock factories (users, courses, enrollments, etc.)
      renderWithRouter.tsx            # Custom render utilities with HashRouter
    components/
      EnrollmentGate.test.tsx         # Component tests
      Layout.test.tsx
    hooks/
      useScript.test.ts              # Hook tests
      useVideoUrl.test.ts
    pages/
      Dashboard.test.tsx             # Page-level integration tests
      Storefront.test.tsx
    services/
      authService.test.ts            # API service unit tests
      certificatesApi.test.ts
      checkoutApi.test.ts
      enrollmentService.test.ts
      paymentsApi.test.ts
      progressApi.test.ts
      reviewsApi.test.ts
    ErrorBoundary.test.tsx            # Standalone component tests
```

### Naming conventions

| Convention | Example |
|------------|---------|
| Test file suffix | `*.test.ts` or `*.test.tsx` |
| Use `.tsx` extension for files that render JSX | `EnrollmentGate.test.tsx` |
| Use `.ts` extension for pure logic/service tests | `checkoutApi.test.ts` |
| Mirror source structure inside `src/__tests__/` | `hooks/useVideoUrl.ts` -> `src/__tests__/hooks/useVideoUrl.test.ts` |
| Helper files live in `src/__tests__/helpers/` | `mockProviders.tsx`, `renderWithRouter.tsx` |

### Vitest config details

From `vitest.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,           // No need to import describe/it/expect in every file
    environment: 'jsdom',    // DOM environment for all tests
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__tests__/', '**.config.{js,ts}', '**/dist/**'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

Key points:
- `globals: true` -- `describe`, `it`, `expect`, `vi`, `beforeEach`, and `afterEach` are available globally. You can still import them explicitly from `vitest` for clarity (and the existing codebase does so).
- `environment: 'jsdom'` -- Every test file runs in a simulated browser environment.
- The `@` alias resolves to the project root, matching the main `vite.config.ts`.

---

## 4. Setup File

The file `src/__tests__/setup.ts` runs before every test file. It configures:

### 1. Jest-DOM matchers

```ts
import '@testing-library/jest-dom';
```

This extends Vitest's `expect` with DOM-specific matchers like `toBeInTheDocument()`, `toHaveClass()`, `toBeVisible()`, etc.

### 2. Automatic cleanup

```ts
afterEach(() => {
  cleanup();
});
```

Calls `@testing-library/react`'s `cleanup()` after every test to unmount rendered components and reset the DOM.

### 3. `window.matchMedia` mock

Mocks `matchMedia` to prevent errors from components that use media queries or responsive hooks. Returns `matches: false` by default.

### 4. `IntersectionObserver` mock

Provides a no-op `IntersectionObserver` class so components using lazy loading or scroll detection do not crash in tests.

### 5. `localStorage` and `sessionStorage` mocks

Replaces browser storage with an in-memory implementation that supports `getItem`, `setItem`, `removeItem`, and `clear`.

---

## 5. Test Catalog

### Service API Tests (`src/__tests__/services/`)

| File | Module Under Test | What It Tests |
|------|-------------------|---------------|
| `authService.test.ts` | `services/api/users.api.ts` | `getCurrentUser` (auth check, profile fetch), `updatePhone` (E.164 validation), `updateProfile` |
| `enrollmentService.test.ts` | `services/api/enrollments.api.ts` | `getUserEnrollments` (auth guard, data mapping), `checkAccess` (unauthenticated, admin bypass) |
| `checkoutApi.test.ts` | `services/api/checkout.api.ts` | `createOrder` (Edge Function invocation, error handling), `verifyPayment` (signature verification, bundle warnings), `checkOrderStatus` (pending/completed states) |
| `paymentsApi.test.ts` | `services/api/payments.api.ts` | `getUserPayments` (pagination, mapping), `getPaymentByOrder` (found/not-found), `processRefund` (Edge Function, Razorpay errors), `getAdminPayments` (status filtering) |
| `certificatesApi.test.ts` | `services/api/certificates.api.ts` | `getUserCertificates` (auth guard, data mapping, empty state), `getCertificate` (by ID, not found) |
| `reviewsApi.test.ts` | `services/api/reviews.api.ts` | `createReview` (auth guard, insert), `updateReview` (update, DB errors), `deleteReview` (success, errors), `getCourseReviews` (paginated reviews with rating summary/distribution) |
| `progressApi.test.ts` | `services/api/progress.api.ts` | `COMPLETION_THRESHOLD` constant, `saveProgress` (insert vs. update/RPC), `markComplete` (Edge Function), `checkCompletion` (threshold logic, already-completed guard), `getModuleProgress` (data mapping), `getResumePosition`, `getProgress`, `getCourseStats` (RPC call) |

### Hook Tests (`src/__tests__/hooks/`)

| File | Hook Under Test | What It Tests |
|------|-----------------|---------------|
| `useVideoUrl.test.ts` | `hooks/useVideoUrl.ts` | Fallback URL for null videoId, signed URL fetching via Edge Function, error/fallback on failure, auth refresh + retry on 401, session expiration handling, optional moduleId, `success: false` response handling |
| `useScript.test.ts` | `hooks/useScript.ts` | Loading state, script load/error events, pre-existing script detection, async attribute, deduplication, cleanup on unmount |

### Component Tests (`src/__tests__/components/`)

| File | Component Under Test | What It Tests |
|------|---------------------|---------------|
| `EnrollmentGate.test.tsx` | `components/EnrollmentGate.tsx` | Course title display, price formatting (paise to rupees), enrollment required message, module count, enroll/view-details buttons |
| `Layout.test.tsx` | `components/Layout.tsx` | Children rendering, logo/brand display, login button (unauthenticated), user info (authenticated), admin link (admin users) |
| `ErrorBoundary.test.tsx` | `components/ErrorBoundary.tsx` | Renders children normally, catches thrown errors, displays fallback UI, does not crash the app |

### Page Tests (`src/__tests__/pages/`)

| File | Page Under Test | What It Tests |
|------|-----------------|---------------|
| `Storefront.test.tsx` | `pages/Storefront.tsx` | Fetches and displays courses, handles API errors gracefully |
| `Dashboard.test.tsx` | `pages/Dashboard.tsx` | Displays user enrollments with course data, empty state, API error handling. Mocks `coursesApi.getCoursesByIds()` and `enrollmentsApi` via `vi.mock('services/api')` (not direct Supabase mocks). |

---

## 6. Mocking Patterns

### Supabase client mock (the core pattern)

Every service test mocks the Supabase client using `vi.hoisted()` + `vi.mock()`. This is the most important pattern in the codebase.

```ts
// Step 1: Create mock object with vi.hoisted() so it is available before module imports
const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
  };
  return { mockSupabase };
});

// Step 2: Mock the supabase module to return our mock
vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

// Step 3: Import the module under test AFTER the mock is set up
import { someApi } from '../../../services/api/some.api';
```

**Why `vi.hoisted()`?** Vitest hoists `vi.mock()` calls to the top of the file (before imports). `vi.hoisted()` ensures the mock object is created before the hoisted `vi.mock()` uses it. Without this, the mock variable would be `undefined` when the mock factory runs.

### Mocking Supabase query chains

Supabase queries use method chaining (`.from().select().eq().single()`). Mock them by returning objects with chained methods:

```ts
// Simple chain: from('table').select('*').eq('id', x).single()
mockSupabase.from.mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: '123', name: 'Test' },
        error: null,
      }),
    }),
  }),
});
```

For deeply nested chains, a helper function can simplify this:

```ts
// From progressApi.test.ts
function mockChainedQuery(result: { data: any; error: any }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue(result),
  };
  mockSupabase.from.mockReturnValue(chain);
  return chain;
}
```

### Mocking Edge Function calls

Edge Functions are called via `supabase.functions.invoke()`:

```ts
mockSupabase.functions.invoke.mockResolvedValue({
  data: {
    success: true,
    orderId: 'order_123',
    amount: 99900,
  },
  error: null,
});
```

For error responses:

```ts
// Edge Function network/transport error
mockSupabase.functions.invoke.mockResolvedValue({
  data: null,
  error: { message: 'Network error' },
});

// Edge Function returns success: false (application-level error)
mockSupabase.functions.invoke.mockResolvedValue({
  data: { success: false, error: 'Course not found' },
  error: null,
});
```

### Mocking auth context

For component/page tests that need auth state, mock the `AuthContext`:

```ts
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', name: 'Test User', role: 'USER' },
    session: { access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));
```

For tests that need to vary auth state per test case, use a mutable variable:

```ts
let mockAuthState: any = { user: null, session: null, isLoading: false };

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }: any) => children,
}));

// In each test:
it('should show admin link for admin users', () => {
  mockAuthState = {
    user: createMockAdmin(),
    session: { access_token: 'mock-token' },
    isLoading: false,
  };
  // render component...
});
```

### Mocking the logger

Several modules import a logger utility. Mock it to avoid console noise:

```ts
vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));
```

### Mocking API modules directly

For page-level tests where the component imports from `services/api`, you can mock the API modules directly instead of mocking the Supabase client. This is simpler and tests the component's integration with the API layer without caring about Supabase internals.

```ts
// Step 1: Create hoisted mock objects for the API modules you need
const { mockEnrollmentsApi, mockCoursesApi } = vi.hoisted(() => {
  const mockEnrollmentsApi = {
    getUserEnrollments: vi.fn(),
  };
  const mockCoursesApi = {
    getCoursesByIds: vi.fn(),
  };
  return { mockEnrollmentsApi, mockCoursesApi };
});

// Step 2: Mock the barrel import
vi.mock('../../../services/api', () => ({
  enrollmentsApi: mockEnrollmentsApi,
  coursesApi: mockCoursesApi,
}));

// Step 3: In tests, set up return values directly
mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([
  { id: 'enroll-1', courseId: 'course-1', progress: { overallPercent: 50 } },
]);
mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([
  { id: 'course-1', title: 'React Course', thumbnail: 'thumb.jpg', type: 'MODULE', description: 'desc' },
]);
```

This pattern is used by `Dashboard.test.tsx` and is recommended for page tests that depend on multiple API modules. It avoids the complexity of mocking nested Supabase query chains.

### Sequential mock responses

Use `mockResolvedValueOnce` for functions called multiple times with different results:

```ts
mockSupabase.functions.invoke
  .mockResolvedValueOnce({ data: null, error: { message: '401' } })  // first call
  .mockResolvedValueOnce({ data: { success: true, signedUrl: 'url' }, error: null });  // retry
```

### Mock factories (test helpers)

The file `src/__tests__/helpers/mockProviders.tsx` provides factory functions for common test data:

```ts
import { createMockUser, createMockAdmin, createMockCourse, createMockEnrollment, createMockCertificate } from '../helpers/mockProviders';

const user = createMockUser({ name: 'Custom Name' });
const admin = createMockAdmin();
const course = createMockCourse({ title: 'My Course', price: 49900 });
const enrollment = createMockEnrollment({ courseId: 'c-1', overallPercent: 75 });
const cert = createMockCertificate({ studentName: 'Jane Doe' });
```

Each factory accepts an `overrides` object to customize any field.

### Render with Router

Components that use React Router hooks need to be wrapped in a router. Use the helper from `src/__tests__/helpers/renderWithRouter.tsx`:

```ts
import { renderWithRouter } from '../helpers/renderWithRouter';

renderWithRouter(<MyComponent />);
```

Or wrap manually:

```ts
render(
  <HashRouter>
    <MyComponent />
  </HashRouter>
);
```

---

## 7. Writing New Tests

### Template: Service API test

```ts
// src/__tests__/services/notificationsApi.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Step 1: Create hoisted mock
const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  };
  return { mockSupabase };
});

// Step 2: Mock supabase module
vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

// Step 3: Import the module under test
import { notificationsApi } from '../../../services/api/notifications.api';

describe('notificationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should return empty array when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await notificationsApi.getNotifications();
      expect(result).toEqual([]);
    });

    it('should fetch notifications for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'n1', message: 'Welcome!', read: false }],
              error: null,
            }),
          }),
        }),
      });

      const result = await notificationsApi.getNotifications();
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Welcome!');
    });
  });
});
```

### Template: Component test

```tsx
// src/__tests__/components/CourseCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter } from 'react-router-dom';
import { CourseCard } from '../../../components/CourseCard';

describe('CourseCard', () => {
  const defaultProps = {
    id: 'course-1',
    title: 'React Fundamentals',
    price: 99900,
    thumbnail: 'https://example.com/thumb.jpg',
  };

  const renderCard = (props = {}) => {
    return render(
      <HashRouter>
        <CourseCard {...defaultProps} {...props} />
      </HashRouter>
    );
  };

  it('should display the course title', () => {
    renderCard();
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
  });

  it('should display the price in rupees', () => {
    renderCard();
    expect(screen.getByText(/999/)).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderCard({ onClick });

    await user.click(screen.getByText('React Fundamentals'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Template: Hook test

```ts
// src/__tests__/hooks/useDebounce.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../../../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    rerender({ value: 'world', delay: 500 });
    expect(result.current).toBe('hello'); // not yet updated

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('world'); // updated after delay
  });
});
```

---

## 8. Coverage

### Running coverage

```bash
npm run test:coverage
```

This generates coverage reports in three formats:
- **`text`** -- Printed to the terminal
- **`json`** -- Machine-readable `coverage/coverage-final.json`
- **`html`** -- Interactive report at `coverage/index.html` (open in a browser)

### Coverage configuration

From `vitest.config.ts`:

```ts
coverage: {
  provider: 'v8',          // Uses V8's built-in coverage (fast, no instrumentation)
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/__tests__/',       // Don't measure test files themselves
    '**.config.{js,ts}',    // Config files
    '**/dist/**',           // Build output
  ],
}
```

### What is currently covered

The existing test suite covers:

- **API services** (7 files): `users`, `enrollments`, `checkout`, `payments`, `certificates`, `reviews`, `progress` -- covering auth guards, data mapping, Edge Function invocation, error handling, and query chaining.
- **Hooks** (2 files): `useVideoUrl` (Edge Function integration, auth refresh, error states), `useScript` (DOM manipulation, lifecycle).
- **Components** (2 files): `EnrollmentGate` (rendering, formatting), `Layout` (auth-dependent UI).
- **Pages** (2 files): `Storefront` (data fetching, error handling), `Dashboard` (enrollment display, empty state).
- **Utilities** (1 file): `ErrorBoundary` (error catching, fallback rendering).

### Known gaps

The following areas do not currently have test coverage:

| Area | Key Files |
|------|-----------|
| Admin pages | `pages/admin/DashboardPage.tsx`, `pages/admin/ReviewsPage.tsx`, `AdminLayout.tsx` |
| Admin API service | `services/api/admin.api.ts` |
| Courses API service | `services/api/courses.api.ts` |
| Site content API | `services/api/siteContent.api.ts` |
| Notifications API | `services/api/notifications.api.ts` |
| Auth context | `context/AuthContext.tsx` |
| Checkout page | `pages/Checkout.tsx` (lazy-loaded) |
| Learn page | `pages/Learn.tsx` |
| Profile page | `pages/Profile.tsx` |
| VideoPlayer component | `components/VideoPlayer.tsx` |
| VideoUploader component | `components/VideoUploader.tsx` |
| Supabase client singleton | `services/supabase.ts` |
| Edge Functions (Deno) | `supabase/functions/` (require separate Deno test runner) |

---

## 9. Best Practices

### Testing Library queries

Use queries in this priority order (per [Testing Library guiding principles](https://testing-library.com/docs/queries/about#priority)):

1. **`getByRole`** -- Most accessible, reflects how users interact with the page.
   ```ts
   screen.getByRole('button', { name: /enroll now/i })
   ```

2. **`getByText`** -- For non-interactive text content.
   ```ts
   screen.getByText('React Masterclass')
   ```

3. **`getByLabelText`** -- For form fields.
   ```ts
   screen.getByLabelText(/email address/i)
   ```

4. **`getByTestId`** -- Last resort when no accessible query works.
   ```ts
   screen.getByTestId('course-card-123')
   ```

Use `queryBy*` variants when asserting that an element does NOT exist:

```ts
expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
```

Use `findBy*` variants for elements that appear asynchronously:

```ts
const title = await screen.findByText('React Course');
expect(title).toBeInTheDocument();
```

### Async patterns

For hooks and components that perform async operations, use `waitFor`:

```ts
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

For async assertions on rejected promises:

```ts
await expect(someApi.doSomething()).rejects.toThrow('Error message');
```

### Always clear mocks

Use `vi.clearAllMocks()` in `beforeEach` to prevent state leaking between tests:

```ts
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Suppress expected console errors

When testing error boundaries or error handlers that log to console, suppress the output:

```ts
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
```

### Avoid implementation details

Test behavior, not implementation:

```ts
// Prefer: test what the user sees
expect(screen.getByText('Enrollment Required')).toBeInTheDocument();

// Avoid: testing internal state or CSS classes
expect(component.state.showGate).toBe(true);
```

### Keep tests isolated

Each test should be independent. Do not rely on test execution order. The `beforeEach(() => vi.clearAllMocks())` pattern ensures clean state.

### Use `act()` for state updates

When triggering events that cause React state changes outside of Testing Library utilities:

```ts
import { act } from '@testing-library/react';

act(() => {
  script?.dispatchEvent(new Event('load'));
});
```

### Group related tests with `describe`

Use nested `describe` blocks to organize tests by method or feature:

```ts
describe('paymentsApi', () => {
  describe('getUserPayments', () => {
    it('should fetch payments with pagination', ...);
    it('should throw on error', ...);
  });

  describe('processRefund', () => {
    it('should invoke refund-process Edge Function', ...);
    it('should throw on Edge Function error', ...);
  });
});
```

### Use fake timers for time-dependent tests

```ts
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('should debounce input', () => {
  // ... trigger input ...
  vi.advanceTimersByTime(300);
  // ... assert debounced value ...
});
```

### Note on Edge Function testing

The Supabase Edge Functions (`supabase/functions/`) run on Deno and are excluded from the Vitest configuration (`tsconfig.json` excludes `supabase/`). They require a separate Deno-based test setup and are not covered by `npm test`. For Edge Function testing guidance, refer to the [Supabase Edge Functions testing docs](https://supabase.com/docs/guides/functions/unit-test).
