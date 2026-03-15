# ADR-002: Why HashRouter over BrowserRouter

> **Status:** Accepted
> **Date:** 2026-03-14 | **Deciders:** core maintainers
> **Supersedes:** N/A | **Superseded by:** N/A

## Context

The Eyebuckz frontend is a React SPA deployed to Cloudflare Pages as a static site. React
Router requires a routing strategy. The two primary options are `BrowserRouter` (clean URLs
like `/dashboard`) and `HashRouter` (hash-prefixed URLs like `/#/dashboard`).

## Decision Drivers

- Cloudflare Pages serves static files; there is no server to handle HTML5 History API fallback
- The `public/_headers` file cannot rewrite all routes to `index.html` for arbitrary deep URLs
  without complex configuration
- The team prioritized zero-config deployment over clean URLs at this stage

## Options Considered

### Option A: BrowserRouter
- Pro: Clean URLs (`/dashboard`, `/course/intro-to-react`)
- Pro: Anchor links work naturally with `#section` fragments
- Con: Requires Cloudflare Pages `_redirects` with `/* /index.html 200` rule
- Con: Server-side rendering or rewrite rules needed for direct URL navigation
- Con: OAuth callback URL must match exactly; hash-based callback handling differs

### Option B: HashRouter *(chosen)*
- Pro: Works on any static host with zero server configuration
- Pro: Cloudflare Pages serves `index.html`; the hash is handled entirely client-side
- Pro: OAuth callback (`index.tsx`) intercepts `#access_token` before React renders
- Con: URLs contain `#` (aesthetic issue; affects SEO if pages are indexed)
- Con: Anchor links within pages require workaround (scrollTo, not `href="#section"`)

## Decision

**We chose HashRouter** because the project deploys to Cloudflare Pages as a pure static site.
The hash-based routing requires zero server configuration and simplifies the OAuth callback
handling in `index.tsx`.

## Consequences

### Positive
- No `_redirects` file or server rewrites needed
- OAuth token is in the hash fragment — `index.tsx` strips it before React renders, preventing
  the `#access_token=...` from appearing in browser history

### Negative / Trade-offs
- All URLs have a `#` prefix — Mitigation: acceptable for an LMS not primarily SEO-driven
- Anchor links to page sections (e.g., FAQ headers) cannot use standard `href="#section"` —
  Mitigation: use `onClick` + `scrollIntoView()` for in-page navigation

### Risks
- If the project ever needs SSR or pre-rendering for SEO, migrating to BrowserRouter requires
  updating all `<Link>` hrefs and the Cloudflare Pages routing configuration

## Links

- [DEPLOYMENT.md](../guides/DEPLOYMENT.md)
- `index.tsx` — OAuth callback handling before React mount
- `App.tsx` — HashRouter provider
