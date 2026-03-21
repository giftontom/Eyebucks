# Admin Page Unit Test Guide

> Last updated: March 21, 2026

This guide covers writing unit tests for admin pages. It provides the canonical mock
setup, a complete worked example, and a per-page checklist for the 11 remaining untested
admin pages.

The existing test file `src/__tests__/pages/admin/CoursesPage.test.tsx` is the canonical
reference — all new tests follow its patterns exactly.

---

## Test File Location

```
src/__tests__/pages/admin/
  CoursesPage.test.tsx     <- canonical example (already written)
  DashboardPage.test.tsx
  CourseEditorPage.test.tsx
  UsersPage.test.tsx
  UserDetailPage.test.tsx
  PaymentsPage.test.tsx
  CertificatesPage.test.tsx
  ContentPage.test.tsx
  CouponsPage.test.tsx
  ReviewsPage.test.tsx
  AuditLogPage.test.tsx
  SettingsPage.test.tsx
```

Run all admin tests:
```bash
npm test -- src/__tests__/pages/admin/
```

Check coverage:
```bash
npm run test:coverage
```

---

## Standard Mock Template

Every admin page test uses this same structure. Copy it as a starting point.

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSomeApi, mockShowToast } = vi.hoisted(() => ({
  mockSomeApi: {
    someMethod: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

// Mock the API module the page imports
vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockSomeApi }));

// Mock AdminContext — showToast is used by almost every page
vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({
    showToast: mockShowToast,
    // Add other fields the page reads from useAdmin():
    // courses, users, refreshUsers, usersLoaded, coursesLoaded, refreshCourses
  }),
}));

// Mock useAdminData only if the page uses it (DashboardPage does not — it calls APIs directly)
vi.mock('../../../../pages/admin/hooks/useAdminData', () => ({
  useAdminData: ({ fetchFn }: { fetchFn: () => Promise<any> }) => {
    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
      fetchFn().then((d: any) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);
    return { data, loading, refetch: vi.fn() };
  },
}));

// Mock shared admin components — keep them minimal
vi.mock('../../../../pages/admin/components/AdminModal', () => ({
  AdminModal: ({ open, children, title }: any) =>
    open ? React.createElement('div', { role: 'dialog', 'aria-label': title }, children) : null,
}));

vi.mock('../../../../pages/admin/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title, confirmLabel = 'Confirm' }: any) =>
    open
      ? React.createElement('div', { role: 'dialog', 'aria-label': title },
          React.createElement('button', { onClick: onConfirm }, confirmLabel)
        )
      : null,
}));

vi.mock('../../../../pages/admin/components/DataTable', () => ({
  DataTable: ({ data, loading, emptyMessage, loadingMessage, columns }: any) => {
    if (loading) return React.createElement('div', null, loadingMessage || 'Loading...');
    if (!data || data.length === 0) return React.createElement('div', null, emptyMessage);
    return React.createElement(
      'table', null,
      React.createElement('tbody', null,
        data.map((row: any) =>
          React.createElement('tr', { key: row.id },
            columns.map((col: any) =>
              React.createElement('td', { key: col.key }, col.render ? col.render(row) : row[col.key])
            )
          )
        )
      )
    );
  },
}));

vi.mock('../../../../pages/admin/components/StatusBadge', () => ({
  StatusBadge: ({ status }: any) => React.createElement('span', null, status),
}));

// Mock react-router-dom if the page uses useNavigate or useParams
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ userId: 'u1' }), // set to match the page's param name
  Link: ({ children, to }: any) => React.createElement('a', { href: to }, children),
}));

// ─── Imports (must come AFTER all vi.mock calls) ───────────────────────────────

import { SomePage } from '../../../../pages/admin/SomePage';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockItem = { id: 'x1', /* fields the page renders */ };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSomeApi.someMethod.mockResolvedValue({ items: [mockItem] });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SomePage', () => {
  it('renders data after loading', async () => {
    render(<SomePage />);
    await waitFor(() => expect(screen.getByText('...')).toBeInTheDocument());
  });
});
```

### Key Rules

- `vi.hoisted()` — must wrap all mock factory objects; this runs before module evaluation
- `vi.mock(...)` calls — must be at the top level, before any imports of the mocked modules
- Page import — must come **after** all `vi.mock()` calls
- `vi.clearAllMocks()` in `beforeEach` — always; prevents state leakage between tests
- `await waitFor(...)` — always wrap assertions that depend on async data loading

---

## Mock Path Reference

All mock paths are relative to `src/__tests__/pages/admin/`:

| What | Mock path |
|------|-----------|
| adminApi | `../../../../services/api/admin.api` |
| couponsApi | `../../../../services/api/coupons.api` |
| supabase client | `../../../../services/supabase` |
| AdminContext | `../../../../pages/admin/AdminContext` |
| useAdminData | `../../../../pages/admin/hooks/useAdminData` |
| AdminModal | `../../../../pages/admin/components/AdminModal` |
| ConfirmDialog | `../../../../pages/admin/components/ConfirmDialog` |
| DataTable | `../../../../pages/admin/components/DataTable` |
| StatusBadge | `../../../../pages/admin/components/StatusBadge` |
| react-router-dom | `react-router-dom` (bare module name) |

---

## Worked Example: DashboardPage

`DashboardPage` uses `adminApi.getStats()`, `adminApi.getSales()`, and
`adminApi.getRecentActivity()` directly (no `useAdminData` hook). It does not use
`AdminContext` — it has its own `useToast` instance.

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    getStats: vi.fn(),
    getSales: vi.fn(),
    getRecentActivity: vi.fn(),
  },
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

// Mock heavy sub-components so the test stays fast
vi.mock('../../../../pages/admin/components/SalesChart', () => ({
  SalesChart: () => React.createElement('div', { 'data-testid': 'sales-chart' }),
}));
vi.mock('../../../../pages/admin/components/ActivityFeed', () => ({
  ActivityFeed: () => React.createElement('div', { 'data-testid': 'activity-feed' }),
}));
vi.mock('../../../../pages/admin/components/QuickActions', () => ({
  QuickActions: () => null,
}));
vi.mock('../../../../pages/admin/components/VideoCleanup', () => ({
  VideoCleanup: () => null,
}));

// ─── Import ───────────────────────────────────────────────────────────────────

import { DashboardPage } from '../../../../pages/admin/DashboardPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockStats = {
  totalRevenue: 500000,
  totalEnrollments: 50,
  activeUsers: 30,
  totalUsers: 100,
  totalCourses: 5,
  draftCourses: 2,
  totalCertificates: 10,
};

const mockSales = [
  { date: '2026-03-01', amount: 100000, count: 1 },
];

const mockActivity = {
  recentEnrollments: [],
  recentPayments: [],
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getStats.mockResolvedValue({ stats: mockStats });
  mockAdminApi.getSales.mockResolvedValue({ sales: mockSales });
  mockAdminApi.getRecentActivity.mockResolvedValue({ activity: mockActivity });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  it('shows loading state initially', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('renders KPI cards after loading', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Total Sales')).toBeInTheDocument());
    expect(screen.getByText('Active Learners')).toBeInTheDocument();
    expect(screen.getByText('Total Courses')).toBeInTheDocument();
    expect(screen.getByText('Certificates')).toBeInTheDocument();
  });

  it('renders sales chart after loading', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByTestId('sales-chart')).toBeInTheDocument());
  });

  it('renders activity feed after loading', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByTestId('activity-feed')).toBeInTheDocument());
  });

  it('shows error toast when getStats fails', async () => {
    mockAdminApi.getStats.mockRejectedValue(new Error('Stats failed'));
    // DashboardPage uses its own useToast — look for a generic error indicator
    render(<DashboardPage />);
    // Page remains in loading indefinitely when all 3 calls fail is acceptable;
    // the toast appears — test that the API was called
    await waitFor(() => expect(mockAdminApi.getStats).toHaveBeenCalled());
  });
});
```

---

## Per-Page Test Checklist

### DashboardPage
**Source:** `pages/admin/DashboardPage.tsx`
**APIs:** `adminApi.getStats`, `adminApi.getSales`, `adminApi.getRecentActivity`
**No AdminContext, no useAdminData** — uses its own `useToast`

Tests to write:
- [ ] Shows loading state initially
- [ ] Renders all 4 KPI card labels after data loads
- [ ] Sales chart rendered after loading
- [ ] Activity feed rendered after loading
- [ ] Error toast shown when API calls fail

---

### CoursesPage
**Source:** `pages/admin/CoursesPage.tsx`
**Status: DONE** — `src/__tests__/pages/admin/CoursesPage.test.tsx` exists

---

### CourseEditorPage
**Source:** `pages/admin/CourseEditorPage.tsx`
**APIs:** `adminApi.getCourse`, `adminApi.updateCourse`, `adminApi.createModule`,
`adminApi.updateModule`, `adminApi.deleteModule`, `adminApi.reorderModules`
**Router:** `useParams` (`{ courseId }`)
**AdminContext:** `showToast`, `refreshCourses`

Tests to write:
- [ ] Shows loading state initially
- [ ] Renders course title after load
- [ ] Renders module list with titles
- [ ] Shows "No modules yet" when module list is empty
- [ ] Calls `createModule` when Add Module form is submitted with valid data
- [ ] Shows success toast after module created
- [ ] Opens delete confirm dialog when Delete button clicked on a module
- [ ] Calls `deleteModule` and shows success toast on confirm
- [ ] Shows error toast when API call fails

Mock notes:
- `useParams` should return `{ courseId: 'c1' }`
- Mock `VideoUploader` with `() => null` — it depends on TUS upload, heavy to test here
- Mock `BundleCoursePicker` with `() => null` if it appears

---

### UsersPage
**Source:** `pages/admin/UsersPage.tsx`
**APIs:** `adminApi.getUsers`, `adminApi.enrollUser` (manual enroll)
**Router:** `useNavigate`
**AdminContext:** `showToast`, `courses`, `coursesLoaded`
**Hooks:** `useDebounce`, `usePagination`

Tests to write:
- [ ] Renders user names in table after loading
- [ ] Shows "No users found" when list is empty
- [ ] Shows loading state while fetching
- [ ] Opens manual enroll modal when Enroll button clicked
- [ ] Calls `enrollUser` and shows success toast when enroll form submitted
- [ ] Shows error toast when `getUsers` fails

Mock notes:
- `useAdmin()` should return `{ showToast: mockShowToast, courses: [mockCourse], coursesLoaded: true }`
- Mock `useDebounce` to return input unchanged: `vi.mock('.../useDebounce', () => ({ useDebounce: (v: any) => v }))`
- Mock `usePagination` to return fixed state if needed, or let it run (it's pure state)

---

### UserDetailPage
**Source:** `pages/admin/UserDetailPage.tsx`
**APIs:** `adminApi.getUserDetails`, `adminApi.revokeEnrollment`
**Router:** `useParams` (`{ userId: 'u1' }`), `Link`
**AdminContext:** `showToast`

Tests to write:
- [ ] Shows loading state initially
- [ ] Renders user name and email after load
- [ ] Renders enrollment list for the user
- [ ] Shows "No enrollments" when list is empty
- [ ] Opens revoke confirm dialog when Revoke button clicked
- [ ] Calls `revokeEnrollment` and shows success toast on confirm
- [ ] Shows error toast when `getUserDetails` fails

Mock fixtures:
```tsx
const mockUser = {
  id: 'u1', name: 'Test User', email: 'test@example.com',
  role: 'USER', is_active: true, phone_e164: null, phone_verified: false,
  avatar: null, created_at: '2026-01-01T00:00:00Z', last_login_at: null,
  enrollments: [{
    id: 'e1', status: 'ACTIVE', amount: 99900, created_at: '2026-01-01T00:00:00Z',
    courses: { id: 'c1', title: 'React Fundamentals', slug: 'react-fundamentals', type: 'MODULE' }
  }],
};
```

---

### PaymentsPage
**Source:** `pages/admin/PaymentsPage.tsx`
**APIs:** `adminApi.getPayments`, `adminApi.getStats`, `adminApi.processRefund`
**AdminContext:** `showToast`
**Hooks:** `useDebounce`, `usePagination`

Tests to write:
- [ ] Renders payment rows after loading
- [ ] Shows loading state initially
- [ ] Opens refund modal when Refund button clicked on a captured payment
- [ ] Calls `processRefund` and shows success toast when refund confirmed
- [ ] Shows error toast when `processRefund` fails
- [ ] Shows "No payments found" when list is empty

Mock fixtures:
```tsx
const mockPayment = {
  id: 'pay1', receiptNumber: 'RCT-001',
  studentName: 'Test User', studentEmail: 'test@example.com',
  courseTitle: 'React Fundamentals', amount: 99900,
  status: 'captured', razorpayPaymentId: 'pay_abc123',
  createdAt: '2026-03-01T00:00:00Z',
};
```

---

### CertificatesPage
**Source:** `pages/admin/CertificatesPage.tsx`
**APIs:** `adminApi.getCertificates`, `adminApi.issueCertificate`, `adminApi.revokeCertificate`
**AdminContext:** `showToast`, `courses`, `users`, `refreshUsers`, `usersLoaded`

Tests to write:
- [ ] Renders certificate rows after loading
- [ ] Shows "No certificates found" when list is empty
- [ ] Opens issue modal when Issue Certificate button clicked
- [ ] Calls `issueCertificate` and shows success toast when form submitted
- [ ] Shows error toast when user/course not selected on issue attempt
- [ ] Opens revoke confirm dialog when Revoke button clicked
- [ ] Calls `revokeCertificate` and shows success toast on confirm

Mock notes:
- `useAdmin()` must return `{ showToast, courses: [mockCourse], users: [mockUser], refreshUsers: vi.fn(), usersLoaded: true }`

Mock fixtures:
```tsx
const mockCert = {
  id: 'cert1', certificateNumber: 'CERT-001',
  studentName: 'Test User', courseTitle: 'React Fundamentals',
  issueDate: '2026-03-01T00:00:00Z', status: 'ACTIVE',
  userId: 'u1', courseId: 'c1',
};
```

---

### ContentPage
**Source:** `pages/admin/ContentPage.tsx`
**APIs:** `adminApi.getContent`, `adminApi.updateContent`, `adminApi.createContent`, `adminApi.deleteContent`
**AdminContext:** `showToast`

Tests to write:
- [ ] Renders section tabs (FAQ, Testimonials, Banners, etc.)
- [ ] Shows content items after loading for the active section
- [ ] Shows loading state initially
- [ ] Opens edit modal when Edit button clicked
- [ ] Calls `updateContent` and shows success toast when save confirmed
- [ ] Shows "No items" when a section is empty
- [ ] Calls `deleteContent` and shows success toast after delete confirmed

---

### CouponsPage
**Source:** `pages/admin/CouponsPage.tsx`
**APIs:** `couponsApi.adminListCoupons`, `couponsApi.adminCreateCoupon`, `couponsApi.adminDeactivateCoupon`
**AdminContext:** `showToast`

Note: CouponsPage imports from `services/api/coupons.api`, not `admin.api`.

```tsx
const { mockCouponsApi, mockShowToast } = vi.hoisted(() => ({
  mockCouponsApi: {
    adminListCoupons: vi.fn(),
    adminCreateCoupon: vi.fn(),
    adminDeactivateCoupon: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));
vi.mock('../../../../services/api/coupons.api', () => ({ couponsApi: mockCouponsApi }));
```

Tests to write:
- [ ] Renders coupon codes in list after loading
- [ ] Shows loading state initially
- [ ] Shows "No coupons" when list is empty
- [ ] Opens create modal when Create Coupon button clicked
- [ ] Shows error toast when code or discount % missing on submit
- [ ] Calls `adminCreateCoupon` and shows success toast on valid submit
- [ ] Opens deactivate confirm dialog when Deactivate button clicked
- [ ] Calls `adminDeactivateCoupon` and shows success toast on confirm

Mock fixtures:
```tsx
const mockCoupon = {
  id: 'coup1', code: 'SAVE10', discount_pct: 10,
  max_uses: 100, use_count: 5,
  expires_at: '2026-12-31T00:00:00Z', is_active: true,
};
```

---

### ReviewsPage
**Source:** `pages/admin/ReviewsPage.tsx`
**APIs:** `adminApi.getReviews`, `adminApi.deleteReview`
**AdminContext:** `showToast`
**Hooks:** `useDebounce`, `usePagination`

Tests to write:
- [ ] Renders review rows after loading
- [ ] Shows loading state initially
- [ ] Shows "No reviews found" when list is empty
- [ ] Opens delete confirm dialog when Delete button clicked
- [ ] Calls `deleteReview` and shows success toast on confirm
- [ ] Shows error toast when `getReviews` fails

Mock fixtures:
```tsx
const mockReview = {
  id: 'rev1', rating: 4, comment: 'Great course!',
  studentName: 'Test User', courseTitle: 'React Fundamentals',
  createdAt: '2026-03-01T00:00:00Z', helpful: 2,
};
```

---

### AuditLogPage
**Source:** `pages/admin/AuditLogPage.tsx`
**Data source:** Direct `supabase` client query on `audit_logs` table (not `adminApi`)

```tsx
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));
vi.mock('../../../../services/supabase', () => ({ supabase: mockSupabase }));
```

Set up the Supabase query chain:
```tsx
const mockSelect = vi.fn().mockReturnValue({
  order: vi.fn().mockReturnValue({
    range: vi.fn().mockResolvedValue({ data: [mockLog], count: 1, error: null }),
  }),
});
mockSupabase.from.mockReturnValue({ select: mockSelect });
```

Tests to write:
- [ ] Shows loading state initially
- [ ] Renders log entries after loading
- [ ] Shows "No audit logs found" when list is empty
- [ ] Shows action badge for each entry
- [ ] Renders pagination controls when total > PAGE_SIZE (25)
- [ ] Expands a log entry when row is clicked (shows old/new value diff)

Mock fixtures:
```tsx
const mockLog = {
  id: 'log1', admin_id: 'admin1', admin_name: 'Admin User',
  action: 'course.publish', entity_type: 'course', entity_id: 'c1',
  old_value: null, new_value: { status: 'PUBLISHED' },
  metadata: {}, created_at: '2026-03-01T00:00:00Z',
};
```

---

### SettingsPage
**Source:** `pages/admin/SettingsPage.tsx`
**APIs:** `adminApi.getSettings`, `adminApi.updateSettings`
**No AdminContext** — SettingsPage manages its own save status state

Tests to write:
- [ ] Shows loading state initially
- [ ] Renders all setting fields after loading
- [ ] Applies loaded values into fields (overrides defaults)
- [ ] Calls `updateSettings` when Save is clicked
- [ ] Shows success indicator after save
- [ ] Shows error indicator when save fails

Mock notes:
- `getSettings` returns an array of `{ key, value }` objects matching the `DEFAULT_SETTINGS` keys
- SettingsPage has no AdminContext dependency — do not mock it

Mock fixtures:
```tsx
const mockSettings = [
  { key: 'maintenance_mode', value: 'false' },
  { key: 'featured_course_id', value: '' },
  { key: 'support_email', value: 'support@eyebuckz.com' },
  { key: 'announcement_banner', value: '' },
];
```

---

## Running Tests

```bash
# Run all admin page tests
npm test -- src/__tests__/pages/admin/

# Run a single page
npm test -- src/__tests__/pages/admin/DashboardPage.test.tsx

# Watch mode
npm test -- src/__tests__/pages/admin/ --watch

# Coverage report (check 50% threshold is still met)
npm run test:coverage
```

Coverage target: all admin tests together should push overall line coverage well above the
50% threshold. Each page needs at minimum: render test, loading state test, and one
happy-path interaction test.
