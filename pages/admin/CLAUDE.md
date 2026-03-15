# Admin Pages — Local Conventions

## Structure
- All admin pages: `pages/admin/{Name}Page.tsx` (PascalCase + Page suffix)
- Routes: registered in `pages/admin/AdminRoutes.tsx` (React.lazy loaded)
- Shared hooks: `pages/admin/hooks/use{Name}.ts` — check here before creating a new hook
- Shared components: `pages/admin/components/` — `AdminSidebar.tsx` (add new nav entries here)

## 12 Admin Pages
| Page | Route | Purpose |
|------|-------|---------|
| `DashboardPage.tsx` | `/admin` | KPIs, sales chart (Recharts), recent activity |
| `CoursesPage.tsx` | `/admin/courses` | Course list, publish/draft toggle, soft-delete |
| `CourseEditorPage.tsx` | `/admin/courses/:id` | Module CRUD, video upload (TUS), bundle config |
| `UsersPage.tsx` | `/admin/users` | User list with search/pagination |
| `UserDetailPage.tsx` | `/admin/users/:id` | User profile, enrollments, manual enroll |
| `PaymentsPage.tsx` | `/admin/payments` | Payment history, refund processing |
| `CertificatesPage.tsx` | `/admin/certificates` | Issue/revoke certificates |
| `ContentPage.tsx` | `/admin/content` | CMS editor (FAQs, testimonials, banners) |
| `CouponsPage.tsx` | `/admin/coupons` | Create/deactivate coupon codes |
| `ReviewsPage.tsx` | `/admin/reviews` | Moderate + delete course reviews |
| `AuditLogPage.tsx` | `/admin/audit` | Admin action log |
| `SettingsPage.tsx` | `/admin/settings` | Site-wide settings |

## Access Control
- All admin routes require `role = 'ADMIN'` — enforced in `AdminRoutes.tsx`
- The `is_admin()` DB function backs all admin RLS policies
- Never bypass auth checks in admin pages — RLS is the safety net

## Known Issues
- **No error boundaries** wrap admin pages — a crash requires full page reload
- Be defensive: handle null/undefined data from RLS-filtered queries

## Data & State
- `useAdminData` hook (in `hooks/`) provides dashboard KPI data
- Recharts is the charting library (already in vendor chunk — no extra bundle cost)
- Use `supabase.rpc('get_admin_stats')` for aggregated dashboard data

## Adding a New Admin Page
1. Create `pages/admin/{Name}Page.tsx`
2. Add lazy route in `pages/admin/AdminRoutes.tsx`
3. Add nav entry in `pages/admin/components/AdminSidebar.tsx`
4. If data-heavy, add hook in `pages/admin/hooks/use{Name}.ts`
