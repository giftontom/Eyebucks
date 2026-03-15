# ADR-005: Why Tailwind CSS v4

> **Status:** Accepted
> **Date:** 2026-03-14 | **Deciders:** core maintainers
> **Supersedes:** N/A | **Superseded by:** N/A

## Context

Eyebuckz needed a utility-first CSS framework. Tailwind CSS v4 was released with a breaking
change from v3: configuration moved from `tailwind.config.js` to CSS-native `@theme {}` blocks.
The project adopted v4 from the start rather than migrating from v3.

## Decision Drivers

- Utility-first CSS for rapid UI development
- Dark mode support via `.dark` class
- Design token system (CSS custom properties)
- Vite-native plugin (`@tailwindcss/vite`) for fast HMR
- No separate build step for CSS

## Options Considered

### Option A: Tailwind CSS v3
- Pro: Large community; well-documented
- Pro: Stable `tailwind.config.js` configuration
- Con: Requires PostCSS configuration
- Con: Will eventually require migration to v4

### Option B: Tailwind CSS v4 *(chosen)*
- Pro: CSS-native `@theme {}` — no JavaScript config file
- Pro: `@tailwindcss/vite` plugin (no PostCSS required)
- Pro: `@utility` declarations for custom utilities
- Pro: Better CSS custom property integration
- Con: Breaking change from v3; less community documentation at adoption time
- Con: Some v3 plugins not yet compatible

### Option C: CSS Modules + PostCSS
- Pro: Standard CSS; no framework lock-in
- Con: More verbose; no utility-first composition
- Con: Dark mode requires more boilerplate

## Decision

**We chose Tailwind CSS v4** because it integrates natively with Vite via `@tailwindcss/vite`,
supports CSS-native token definitions via `@theme {}`, and eliminates the `tailwind.config.js`
JavaScript configuration file.

## Consequences

### Positive
- Design tokens defined once in `index.css` `@theme {}` block are available as utility classes
- Dark mode via `.dark` on `<html>` element; all tokens have light and dark values
- Custom utilities via `@utility` in `index.css` (e.g., `t-bg`, `t-text`, `t-card`)

### Negative / Trade-offs
- **No `tailwind.config.js` exists** — any tooling that expects one (JetBrains Tailwind plugin
  in config mode) must be pointed at `index.css`
- Less community documentation for v4-specific features compared to v3
  — Mitigation: the project's own `DESIGN_SYSTEM.md` and `index.css` are the source of truth

### Critical Rule

> **Never hardcode colors.** Always use semantic token utilities (`t-bg`, `t-text`) and
> CSS custom properties (`var(--text-1)`). Never write `bg-white`, `text-gray-900`, or
> any other hardcoded Tailwind color utility. This breaks dark mode.

### Risks

- If a developer unfamiliar with v4 adds `tailwind.config.js`, it will be ignored silently and
  tokens defined there will not work
  — Mitigation: `CODING_STANDARDS.md` documents this; the v4 entry point is `index.css`

## Links

- `index.css` — `@theme {}` token block + `@utility` declarations
- [DESIGN_SYSTEM.md](../reference/DESIGN_SYSTEM.md)
- [CODING_STANDARDS.md](../../CODING_STANDARDS.md)
