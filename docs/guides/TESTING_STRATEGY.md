# TESTING_STRATEGY

> **Last updated:** 2026-03-14 | **Status:** Stable | **Audience:** All developers

## Table of Contents

1. [Testing Pyramid](#1-testing-pyramid)
2. [What to Unit Test vs. Not](#2-what-to-unit-test-vs-not)
3. [Hook Tests](#3-hook-tests)
4. [Component Tests](#4-component-tests)
5. [E2E Tests with Playwright](#5-e2e-tests-with-playwright)
6. [Coverage Targets](#6-coverage-targets)
7. [CI Integration](#7-ci-integration)

---

## 1. Testing Pyramid

```
         ┌─────────────┐
         │     E2E     │  Playwright — 4–6 critical paths
         └─────────────┘
       ┌───────────────────┐
       │   Component Tests  │  React Testing Library — 3+ components
       └───────────────────┘
     ┌─────────────────────────┐
     │       Hook Tests         │  renderHook + act — 4+ hooks
     └─────────────────────────┘
   ┌───────────────────────────────┐
   │       Unit / API Service Tests │  Vitest — 7+ service modules
   └───────────────────────────────┘
```

**Stack:** Vitest 4.x + jsdom + @testing-library/react + @testing-library/user-event + @testing-library/jest-dom

**Test file location:** `src/__tests__/` (services/, hooks/, components/, pages/)

**Run tests:**
```bash
npm test                 # Watch mode
npm run test:coverage    # Coverage report (50% threshold, V8 provider)
```

---

## 2. What to Unit Test vs. Not

### DO unit test

- **API service functions** (`services/api/*.api.ts`) — mock Supabase client, assert correct
  table/RPC calls, assert error handling
- **Hook logic** — auto-save intervals, completion thresholds, optimistic updates
- **Pure business logic** — coupon discount calculation, price formatting, slug construction

### DO NOT unit test

- **Supabase client itself** — it's a tested library; mock it, don't test it
- **Edge Functions** — test via integration or E2E; Deno unit tests are complex to set up
- **Tailwind CSS classes** — visual regression tests cover appearance

### Mock boundary

Mock at the **module level**, not the Supabase client level, for page tests. This prevents
tests from breaking when query chains change.

```ts
// Page test (mock API module — PREFERRED)
vi.mock('../../../services/api', () => ({ coursesApi: { getCourse: vi.fn() } }));

// Hook/service test (mock Supabase client — REQUIRED at this level)
vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));
```

---

## 3. Hook Tests

Use `renderHook` from `@testing-library/react` wrapped in `act` for state updates.

### Pattern

```ts
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  }
}));
vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

describe('useAccessControl', () => {
  it('grants access to admins regardless of enrollment', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-uuid' } }
    });
    // ... mock from chain ...

    const { result } = renderHook(() => useAccessControl('course-123'));
    await act(async () => { /* wait for async operations */ });

    expect(result.current.hasAccess).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });
});
```

### Hook test priorities

| Hook | Key test cases |
|------|---------------|
| `useModuleProgress` | Auto-save fires at 30s, completion triggers at 95% threshold |
| `useAccessControl` | Admin always has access; enrolled user has access; unenrolled blocked |
| `useVideoUrl` | CDN URL served immediately; signed URL upgrades on success; fallback on failure |
| `useWishlist` | Optimistic toggle; reverts on error; loads full list on mount |

---

## 4. Component Tests

Use `@testing-library/react` `render` + `screen` + `userEvent`. Mock at the API module level.

### Pattern

```ts
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';

const { mockCoursesApi } = vi.hoisted(() => ({
  mockCoursesApi: { getCourse: vi.fn() }
}));
vi.mock('../../../services/api', () => ({ coursesApi: mockCoursesApi }));

// Wrap render in providers if the component requires context
const renderWithProviders = (ui: React.ReactNode) =>
  render(<AuthProvider><ThemeProvider>{ui}</ThemeProvider></AuthProvider>);
```

### Component test priorities

| Component | Key test cases |
|-----------|---------------|
| `EnrollmentGate` | Shows paywall for unenrolled user; shows children for enrolled user |
| `NotificationBell` | Renders unread count badge; marks read on click |
| `ErrorBoundary` | Catches thrown errors; renders fallback UI |

### What NOT to test in component tests
- Exact CSS classes (brittle; use visual regression for appearance)
- Implementation details (state variable names, internal method calls)

---

## 5. E2E Tests with Playwright

E2E tests cover the critical user journeys that unit tests cannot verify. They test the full
stack: frontend → Supabase → Edge Functions.

### Setup

```bash
npx playwright install chromium
# Configure playwright.config.ts with baseURL = http://localhost:3000
```

### Critical paths — these MUST have E2E coverage

| Path | Test file | Assertions |
|------|-----------|-----------|
| Login → Dashboard | `e2e/auth.spec.ts` | Google OAuth redirects, dashboard loads, user name shown |
| Course Detail → Checkout → PurchaseSuccess | `e2e/checkout.spec.ts` | Razorpay modal opens, payment succeeds, enrollment created, success page shown |
| Learn page: video loads, progress saves, module complete | `e2e/learn.spec.ts` | HLS video plays, 30s auto-save fires, 95% completion marks module done |
| Admin: publish course | `e2e/admin.spec.ts` | Admin can toggle course to PUBLISHED; appears on Storefront |
| Admin: manual enroll | `e2e/admin.spec.ts` | Admin can create enrollment; user can access course immediately |

### Running E2E

```bash
npx playwright test            # Run all E2E tests
npx playwright test --headed   # See the browser
npx playwright test e2e/auth   # Run a specific test file
```

### E2E test data strategy

- Use a dedicated test user account in Supabase
- Use test-mode Razorpay keys (card: 4111 1111 1111 1111)
- Clean up test enrollments/payments after each test run

---

## 6. Coverage Targets

| Layer | Target | Current threshold |
|-------|--------|-----------------|
| `services/api/` | 70% | 50% (global) |
| `hooks/` | 60% | 50% (global) |
| `components/` | 50% | 50% (global) |
| `pages/` | 40% | 50% (global) |
| **Global** | **50%** | **50%** |

The global 50% threshold is enforced by Vitest and will fail `npm run test:coverage` if not met.

---

## 7. CI Integration

### Recommended pipeline

| Stage | Trigger | Command | Time |
|-------|---------|---------|------|
| Unit + Component | Every commit | `npm test -- --run` | ~30s |
| Type check | Every commit | `npm run type-check` | ~10s |
| Coverage | Every PR | `npm run test:coverage` | ~60s |
| E2E | Every PR (nightly) | `npx playwright test` | ~5min |

### Pre-commit (via `/pre-commit` skill)
```bash
npm run lint && npm run type-check && npm test -- --run && npm run build
```

### Integration with Claude Code

- `/run-tests` — runs unit tests with failure analysis
- `/test-coverage` — full coverage report with uncovered path analysis
- `/e2e-test [flow]` — runs Playwright for login|checkout|enrollment|video|admin|all
- `/pre-commit` — full pipeline gate before committing
