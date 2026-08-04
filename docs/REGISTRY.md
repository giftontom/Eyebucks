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
| 2026-03-26 | Updated | Project | docs/project/KNOWN_ISSUES.md | Added item 6b — video player bug (6 compounding issues resolved: path-based Bunny token, CSP blob:, error overlay race, Phase 1 CDN pre-serve) |
| 2026-03-26 | Updated | Architecture | docs/architecture/SECURITY_MODEL.md | Video security: corrected Bunny token hash format; documented path-based token URL format and why query-param format doesn't work with HLS.js |
| 2026-03-26 | Updated | Architecture | docs/architecture/SYSTEM_OVERVIEW.md | Video pipeline: updated token signing formula and URL format; CSP requirement noted |
| 2026-03-26 | Updated | Reference | docs/reference/HOOKS.md | useVideoUrl: removed Phase 1 CDN pre-serve description; updated behavior to reflect token-auth-enabled CDN |
| 2026-03-26 | Updated | Reference | docs/reference/COMPONENTS.md | VideoPlayer: corrected prop types; added CSP requirement; documented hlsErrorFiredRef race condition fix and in-place URL refresh behavior |
| 2026-03-21 | Updated | Guide | docs/guides/DEPLOYMENT.md | Migration count updated to 26 (001-026); next migration number updated to 027 |
| 2026-03-21 | Updated | Architecture | docs/architecture/SYSTEM_OVERVIEW.md | DB table count corrected to 16; RPC count corrected to 15; migration count updated to 26 |
| 2026-03-21 | Updated | API | docs/api/EDGE_FUNCTIONS.md | Added coupon-apply and video-cleanup function documentation; updated shared utilities TOC to include emailTemplates.ts |
| 2026-06-04 | Created | Project | docs/project/UI_UX_REVIEW.md | UI/UX review across dark/light + desktop/mobile; scroll-to-top fix, price formatting, uniform cards; prioritized P0/P1/P2 plan |
| 2026-06-04 | Created | Standard | SKILLS_STANDARDS.md | Canonical Claude skill-authoring standard (Agent Skills) — frontmatter, descriptions, allowed-tools, triggers SoT, evals |
| 2026-06-04 | Created | Project | docs/project/SKILLS_AUDIT.md | Per-skill standardization tracker for all 49 skills (descriptions, allowed-tools, naming, evals) |
| 2026-06-04 | Created | ADR | docs/adr/007-agent-skills-standard.md | Decision to standardize the 49 skills on the Agent Skills standard with skills-lint governance |
| 2026-06-04 | Updated | Index | CLAUDE.md | Refreshed counts (49 skills, migration 030), added Courses/Notifications pages, renamed github-actions-claude→review, canonical trigger source |
| 2026-06-21 | Updated | Index | CLAUDE.md | CMS overhaul: next migration → 036; Edge Functions 11→12 (admin-image-upload); API modules 13→14 (siteImages.api.ts); ImageUpload added to components catalog; site_content section keys widened to 18; CMS gaps marked resolved; Important Files updated |
| 2026-06-21 | Updated | Project | docs/project/KNOWN_ISSUES.md | Added item 12 — CMS section coverage gaps resolved (migration 033, admin-image-upload, siteImages.api.ts, ImageUpload, sectionSchemas.ts); bumped Last updated date |
| 2026-06-21 | Updated | API | docs/api/EDGE_FUNCTIONS.md | Added admin-image-upload (§1, Bunny Storage proxy, JWT+admin); renumbered §2–12; added Bunny Storage secrets to env summary |
| 2026-06-21 | Updated | API | docs/api/SERVICE_MODULES.md | Added siteImages.api.ts (§11: uploadImage, deleteImage, pathFromUrl); renumbered §12–14; updated barrel import example |
| 2026-06-21 | Updated | Reference | docs/reference/COMPONENTS.md | Added ImageUpload (§7, admin CMS image uploader); renumbered §8–18; bumped Last updated + component count 19→20 |
| 2026-06-22 | Created | ADR | docs/adr/008-digital-assets-feature.md | Digital Assets feature: native shop, separate digital_assets/asset_purchases tables, product-aware shared checkout, private-zone signed downloads, TUS large-file upload |
| 2026-06-22 | Updated | ADR | docs/adr/README.md | Backfilled missing ADR index rows 006 + 007; added 008 (Digital Assets) |
| 2026-06-22 | Created | Operations | docs/operations/DIGITAL_ASSETS_GO_LIVE.md | Go-live runbook for Digital Assets: apply migrations 039/040, create bucket, deploy 7 edge fns, security/RLS review gate, E2E verification, rollback |
| 2026-06-22 | Updated | Index | CLAUDE.md | Digital Assets: tables 16→18 (digital_assets, asset_purchases), ENUMs 6→8 (asset_file_type, asset_license), RPCs 15→16 (apply_asset_coupon), edge fns 12→15 (+admin-asset-upload, asset-claim-free, asset-download-url; checkout/coupon-apply product-aware noted), API modules 14→15 (+digitalAssets.api.ts; checkout/coupons new methods), pages catalog (+Assets, AssetDetails, AssetCheckout, DigitalAssetsPage, DigitalAssetEditorPage; Dashboard Library tab), components catalog (+AssetCard, AssetUploader, OwnedAssetsTab), types (DigitalAsset, AssetPurchase, AssetFileType, AssetLicense), migration count 35→40, email templates note updated |
| 2026-06-22 | Updated | API | docs/api/EDGE_FUNCTIONS.md | Digital Assets: count 12→15; added admin-asset-upload, asset-claim-free, asset-download-url; updated checkout-create-order/verify/webhook to note product-aware branching; updated coupon-apply to note apply_asset_coupon RPC path; added assetDeliveryEmail to emailTemplates section |
| 2026-06-22 | Updated | API | docs/api/SERVICE_MODULES.md | Digital Assets: count 14→15; added digitalAssets.api.ts (§15) with all storefront + admin functions; documented new checkout.api.ts methods (createAssetOrder, verifyAssetPayment, claimFreeAsset, checkAssetOrderStatus); documented coupons.api.ts applyAssetCoupon; updated barrel import example |
| 2026-06-22 | Updated | Architecture | docs/architecture/DATABASE_SCHEMA.md | Digital Assets: migration count 21→40; tables 16→18 (added digital_assets §17, asset_purchases §18); ENUMs 6→8 (asset_file_type, asset_license); updated payments table (asset_id + XOR CHECK); updated coupon_uses table (asset_id + XOR constraints); DB functions 14→15 (apply_asset_coupon); Storage buckets: added digital-assets private bucket with policy notes |
| 2026-06-22 | Updated | Reference | docs/reference/COMPONENTS.md | Digital Assets: component count 20→23; added AssetCard (§7a), AssetUploader (§7b), OwnedAssetsTab (§7c); bumped Last updated |
| 2026-06-22 | Updated | Project | docs/project/KNOWN_ISSUES.md | Added item 13 — Digital Assets feature built but not deployed; go-live gated on DIGITAL_ASSETS_GO_LIVE.md runbook + security-redteam + RLS review; deferred scope listed |
