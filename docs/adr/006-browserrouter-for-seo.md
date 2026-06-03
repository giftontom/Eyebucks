# ADR-006: Switch to BrowserRouter for SEO-friendly URLs

> **Status:** Accepted
> **Date:** 2026-06-03 | **Deciders:** core maintainers
> **Supersedes:** [ADR-002](002-why-hashrouter.md) | **Superseded by:** N/A

## Context

[ADR-002](002-why-hashrouter.md) chose `HashRouter` for zero-config static hosting on Cloudflare
Pages. As the product approaches public launch, search-engine discoverability of the public pages
(Storefront, CourseDetails, About, Contact, Privacy, Terms) became a priority. Hash-based URLs
(`/#/course/x`) are not crawled/indexed by search bots — the exact "Revisit Trigger" that ADR-002
anticipated.

## Decision

**We migrated to `BrowserRouter`** (clean URLs like `/course/x`). Cloudflare Pages serves the SPA
deep-link fallback via `public/_redirects`, so direct hits and refreshes on any route resolve to
`index.html` and are handled client-side by React Router.

## Implementation

Following the migration path from ADR-002's Revisit Trigger:

1. `public/_redirects` contains `/* /index.html 200` (SPA fallback) — plus the apex redirect
   `https://www.eyebuckz.com/* → https://eyebuckz.com/:splat 301`.
2. `App.tsx` uses `<BrowserRouter>` (was `<HashRouter>`).
3. Internal navigation uses path-based `<Link to="/...">` / `navigate('/...')` (no `#/` prefixes).
4. The OAuth callback in `index.tsx` continues to parse `window.location.hash` for the
   `#access_token` fragment, which Supabase still returns in the redirect hash under BrowserRouter.

## Consequences

### Positive
- Public pages are crawlable/indexable — clean, shareable URLs.
- Anchor links to in-page sections can use standard `href="#section"` fragments again.

### Negative / Trade-offs
- Requires the `_redirects` SPA fallback to be present on every deploy — without it, deep links and
  refreshes 404. (Covered by `public/_redirects`, which ships with the build.)

### Risks
- Any new hosting target must support SPA fallback rewrites (or re-introduce the regression).

## Links

- [ADR-002](002-why-hashrouter.md) — superseded; documents the original HashRouter decision + migration path
- `public/_redirects` — SPA fallback + apex redirect
- `App.tsx` — `BrowserRouter` provider
- `index.tsx` — OAuth callback handling before React mount
