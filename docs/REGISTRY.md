# Documentation Registry

> Append-only log. Every doc created or updated must have an entry here.
> When you run `/new-doc` or `/update-doc`, a row is automatically appended.

| Date | Action | Type | File | Description |
|------|--------|------|------|-------------|
| 2026-03-14 | Created | Standard | DOCUMENTATION_STANDARDS.md | Project-wide documentation writing standards, templates, and maintenance rules |
| 2026-03-14 | Created | Index | docs/README.md | Central documentation index — links to all docs directories |
| 2026-03-14 | Created | ADR | docs/adr/README.md | ADR index table + template + how-to-add instructions |
| 2026-03-14 | Created | ADR | docs/adr/001-why-supabase.md | Why Supabase over custom Express/Prisma backend |
| 2026-03-14 | Created | ADR | docs/adr/002-why-hashrouter.md | Why HashRouter over BrowserRouter for Cloudflare Pages deployment |
| 2026-03-14 | Created | ADR | docs/adr/003-why-razorpay.md | Why Razorpay for payments (India-first, INR, UPI support) |
| 2026-03-14 | Created | ADR | docs/adr/004-why-bunny-net.md | Why Bunny.net for video hosting (HLS, CDN, signed URLs) |
| 2026-03-14 | Created | ADR | docs/adr/005-why-tailwind-v4.md | Why Tailwind CSS v4 with Vite plugin over CDN or v3 |
| 2026-03-14 | Created | Operations | docs/operations/ADMIN_RUNBOOK.md | Admin panel operational procedures (enrollments, refunds, coupons, certificates) |
| 2026-03-14 | Created | Operations | docs/operations/INCIDENT_RESPONSE.md | Incident response runbook — triage, escalation, recovery steps |
| 2026-03-14 | Created | Guide | docs/guides/ADMIN_PANEL.md | Admin panel feature guide — all pages, workflows, and permissions |
| 2026-03-14 | Created | Guide | docs/guides/DEPLOYMENT.md | Cloudflare Pages + Supabase deployment process |
| 2026-03-14 | Created | Guide | docs/guides/DEVELOPMENT_SETUP.md | Local dev environment setup from scratch |
| 2026-03-14 | Created | Guide | docs/guides/JSDOC_GUIDE.md | JSDoc standards for this project — tags, anti-patterns, examples |
| 2026-03-14 | Created | Guide | docs/guides/PERFORMANCE_GUIDE.md | Performance optimization guide — bundle size, lazy loading, caching |
| 2026-03-14 | Created | Guide | docs/guides/TESTING_STRATEGY.md | Testing strategy — unit, integration, E2E, coverage targets |
| 2026-03-14 | Created | Guide | docs/guides/TESTING.md | Vitest config and writing tests reference |
| 2026-03-14 | Created | Guide | docs/guides/TROUBLESHOOTING.md | Common issues and fixes |
| 2026-03-14 | Created | Architecture | docs/architecture/ACCESS_CONTROL.md | Route protection and role-based access control matrix |
| 2026-03-14 | Created | Architecture | docs/architecture/DATABASE_SCHEMA.md | All 16 tables, columns, relationships, RLS policies, ENUMs |
| 2026-03-14 | Created | Architecture | docs/architecture/SECURITY_MODEL.md | Auth, RLS, payment security, URL signing model |
| 2026-03-14 | Created | Architecture | docs/architecture/SYSTEM_OVERVIEW.md | Full tech stack, data flow diagrams, system architecture |
| 2026-03-14 | Created | API | docs/api/EDGE_FUNCTIONS.md | All 11 Edge Functions with params, auth, and shared utilities |
| 2026-03-14 | Created | API | docs/api/SERVICE_MODULES.md | All 13 API service modules with function signatures |
| 2026-03-14 | Created | Reference | docs/reference/COMPONENTS.md | All components with props, usage examples |
| 2026-03-14 | Created | Reference | docs/reference/DESIGN_SYSTEM.md | CSS tokens and Tailwind v4 utility classes reference |
| 2026-03-14 | Created | Reference | docs/reference/HOOKS.md | All hooks with signatures and return values |
| 2026-03-14 | Created | Reference | docs/reference/USER_FLOWS.md | User journey diagrams — auth, purchase, learning, admin |
| 2026-03-19 | Updated | Guide | docs/guides/TESTING.md | Test inventory updated to 36 files / 316 tests; added new test files, known failing tests section, updated gaps |
| 2026-03-19 | Updated | API | docs/api/EDGE_FUNCTIONS.md | Added emailTemplates.ts shared utility section; updated checkout-verify and certificate-generate side-effect docs to reference branded templates; updated function count to 11 |
| 2026-03-19 | Updated | API | docs/api/SERVICE_MODULES.md | reviews.api.ts — updated getCourseReviews to document get_review_summary RPC (replaces double-fetch); getCourse — fixed stale startsWith('c') heuristic description |
| 2026-03-19 | Updated | Architecture | docs/architecture/SYSTEM_OVERVIEW.md | Admin layout note: AdminErrorFallback wraps Outlet; last-updated date |
| 2026-03-19 | Updated | Guide | docs/guides/DEPLOYMENT.md | Edge function count corrected to 11; added coupon-apply, session-enforce, video-cleanup; migration list extended to 023; next=024 noted |
| 2026-03-19 | Updated | Reference | docs/reference/HOOKS.md | useVideoUrl behavior updated — silent error suppression when CDN fallback available |
| 2026-03-19 | Created | Project | docs/project/TEST_PLAN.md | Comprehensive test plan: coverage matrix, per-phase task breakdown (A1-A15), effort estimates |
| 2026-03-19 | Created | Project | docs/project/LAUNCH_CHECKLIST.md | Pre-launch checklist: owner tasks (O1-O13) and AI tasks (A1-A23) with quality gates |
| 2026-03-19 | Created | Project | docs/project/TASK_OWNERSHIP.md | Full AI vs owner task split with descriptions, phases, priorities, and critical path to launch |
| 2026-03-19 | Created | Project | docs/project/OWNER_TEST_PLAN.md | Owner manual test plan — 10 flows (guest browsing, auth, purchase, emails, learning, dashboard, profile, admin, error cases, mobile) with pass/fail criteria and launch gate |
| 2026-03-21 | Created | Guide | docs/guides/ADMIN_TEST_GUIDE.md | Per-page admin test checklists, standard mock template, DashboardPage worked example; covers all 11 remaining untested admin pages |
| 2026-03-21 | Updated | Project | docs/project/LAUNCH_CHECKLIST.md | A1/A2/A3/A7 marked done; P1.5 section added with A16-A25 for admin page tests; ADMIN_TEST_GUIDE cross-reference added |
| 2026-03-21 | Updated | Project | docs/project/KNOWN_ISSUES.md | Item 10 progress updated (CoursesPage done); SOW gaps R9-R12 added as resolved (video trailer, sticky buy, right-click disable, session limit) |
| 2026-03-21 | Updated | Guide | docs/guides/TESTING.md | A1-A3 tests resolved; known failing tests section updated; admin coverage gap updated; admin dir added to structure |
| 2026-03-21 | Updated | Guide | docs/guides/DEPLOYMENT.md | Migration count updated to 26 (001-026); next migration number updated to 027 |
| 2026-03-21 | Updated | Architecture | docs/architecture/SYSTEM_OVERVIEW.md | DB table count corrected to 16; RPC count corrected to 15; migration count updated to 26 |
| 2026-03-21 | Updated | API | docs/api/EDGE_FUNCTIONS.md | Added coupon-apply and video-cleanup function documentation; updated shared utilities TOC to include emailTemplates.ts |
