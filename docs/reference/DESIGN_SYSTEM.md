# Design System Reference

> Last updated: March 6, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [CSS Token Reference](#css-token-reference)
3. [Badge](#badge)
4. [Button](#button)
5. [Input](#input)
6. [Card](#card)
7. [statusToVariant() Reference](#statustovariant-reference)
8. [When to Use Which Component](#when-to-use-which-component)

---

## Overview

The Eyebuckz design system is built on two layers:

1. **CSS custom property tokens** — semantic variables defined in `index.css` that resolve to different values in light and dark mode. Components reference tokens (e.g., `var(--text-1)`) rather than hardcoded colours.
2. **UI primitive components** — `Badge`, `Button`, `Input`, and `Card` wrap the token layer in reusable, typed React components that handle all variant, size, loading, and accessible label/error patterns.

**Philosophy:**
- Prefer semantic tokens (`--text-1`, `--surface`) over raw Tailwind colour utilities (`text-slate-900`, `bg-white`). Tokens automatically adapt to dark mode with zero additional code.
- Use primitive components rather than assembling raw HTML + Tailwind from scratch. This keeps variant styling centralised and makes global visual changes a one-line edit.
- Dark mode is class-based (`.dark` on `<html>`), not `prefers-color-scheme` media query.

---

## CSS Token Reference

All tokens are defined in `index.css`. Light-mode values are set on `:root`; dark-mode overrides are set on `.dark`.

### Page / Surface Tokens

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--page-bg` | `#ffffff` | `#000000` | Main page background |
| `--page-alt` | `#f8fafc` | `#111111` | Alternate section background (zebra rows, sidebars) |
| `--surface` | `#ffffff` | `rgba(255,255,255,0.05)` | Card / panel surface |
| `--surface-hover` | `#f1f5f9` | `rgba(255,255,255,0.08)` | Hover state for interactive surfaces |
| `--border` | `#e2e8f0` | `rgba(255,255,255,0.10)` | Dividers, borders |

### Text Tokens

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--text-1` | `#0f172a` | `#ffffff` | Primary text (headings, body) |
| `--text-2` | `#64748b` | `#9ca3af` | Secondary / muted text (labels, subtitles) |
| `--text-3` | `#94a3b8` | `#4b5563` | Tertiary / placeholder text |

### Input Token

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--input-bg` | `#f8fafc` | `rgba(255,255,255,0.05)` | Input field background |

### Nav Tokens

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--nav-bg` | `rgba(255,255,255,0.9)` | `rgba(0,0,0,0.80)` | Sticky navigation background (frosted) |
| `--nav-border` | `#e2e8f0` | `rgba(255,255,255,0.10)` | Navigation bottom border |

### Status Tokens

Each semantic status (`success`, `warning`, `danger`, `info`) exposes three tokens:

| Token pattern | Purpose |
|---------------|---------|
| `--status-{status}-bg` | Badge / alert background tint |
| `--status-{status}-text` | Badge text and icon colour |
| `--status-{status}-border` | Badge border colour |

| Status | Light bg | Light text | Dark bg | Dark text |
|--------|----------|------------|---------|-----------|
| `success` | `#dcfce7` | `#15803d` | `rgba(34,197,94,0.10)` | `#4ade80` |
| `warning` | `#fef9c3` | `#a16207` | `rgba(234,179,8,0.10)` | `#facc15` |
| `danger` | `#fee2e2` | `#b91c1c` | `rgba(239,68,68,0.10)` | `#f87171` |
| `info` | `#dbeafe` | `#1d4ed8` | `rgba(59,130,246,0.10)` | `#60a5fa` |

### Shadow Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--shadow-brand` | `0 4px 24px -4px rgba(255,59,48,0.30)` | Brand-coloured glow on primary buttons |
| `--shadow-elevated` | `0 10px 40px -8px rgba(0,0,0,0.30)` | Elevated card / modal shadow |

### Utility Classes (`t-*`)

These single-property utility classes are generated via `@utility` in `index.css`. Apply them directly in JSX `className` strings.

| Class | CSS property | Token used |
|-------|-------------|------------|
| `t-bg` | `background-color` | `--page-bg` |
| `t-bg-alt` | `background-color` | `--page-alt` |
| `t-card` | `background-color` | `--surface` |
| `t-text` | `color` | `--text-1` |
| `t-text-2` | `color` | `--text-2` |
| `t-text-3` | `color` | `--text-3` |
| `t-border` | `border-color` | `--border` |
| `t-input-bg` | `background-color` | `--input-bg` |
| `t-nav` | `background-color` | `--nav-bg` |
| `t-nav-border` | `border-color` | `--nav-border` |
| `t-divide` | `border-color` | `--border` |
| `t-status-success` | bg + color + border-color | `--status-success-*` |
| `t-status-warning` | bg + color + border-color | `--status-warning-*` |
| `t-status-danger` | bg + color + border-color | `--status-danger-*` |
| `t-status-info` | bg + color + border-color | `--status-info-*` |

**Example:**

```tsx
<div className="t-bg min-h-screen">
  <h1 className="t-text text-2xl font-bold">Title</h1>
  <p className="t-text-2 text-sm">Subtitle</p>
  <div className="t-card t-border border rounded-2xl p-6">Card content</div>
</div>
```

---

## Badge

Small, pill-shaped label for displaying status, categories, and counts.

```tsx
import { Badge, statusToVariant } from '../components';
import type { BadgeVariant, BadgeSize } from '../components/Badge';
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `BadgeVariant` | `'default'` | Visual style (see variants below) |
| `size` | `BadgeSize` | `'sm'` | `'sm'` \| `'md'` |
| `dot` | `boolean` | `false` | Renders a small coloured dot before the label |
| `className` | `string` | `''` | Additional Tailwind classes |
| `children` | `ReactNode` | required | Badge label content |

### Variants

| Variant | Visual | Token layer |
|---------|--------|-------------|
| `success` | Green bg / text / border | `t-status-success` |
| `warning` | Yellow bg / text / border | `t-status-warning` |
| `danger` | Red bg / text / border | `t-status-danger` |
| `info` | Blue bg / text / border | `t-status-info` |
| `brand` | Brand-red tinted bg, brand text | Hardcoded brand tokens |
| `default` | Surface bg, muted text, border | `t-card t-border t-text-2` |
| `outline` | Transparent bg, muted text, border | `bg-transparent t-border t-text-2` |

### Examples

```tsx
// Static variants
<Badge variant="success">Published</Badge>
<Badge variant="warning">Draft</Badge>
<Badge variant="danger">Revoked</Badge>
<Badge variant="info">Pending</Badge>
<Badge variant="brand">Admin</Badge>
<Badge variant="default" size="md">Module</Badge>

// With dot indicator
<Badge variant="success" dot>Active</Badge>

// Dynamic status (from API data)
<Badge variant={statusToVariant(payment.status)}>{payment.status}</Badge>
```

---

## Button

Accessible, focusable button with loading state, icon slots, and multiple variants.

```tsx
import { Button } from '../components';
import type { ButtonVariant, ButtonSize } from '../components/Button';
```

### Props

Extends all native `React.ButtonHTMLAttributes<HTMLButtonElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `ButtonVariant` | `'primary'` | Visual style |
| `size` | `ButtonSize` | `'md'` | `'sm'` \| `'md'` \| `'lg'` \| `'icon'` |
| `loading` | `boolean` | `false` | Shows a spinning loader in the left icon slot; disables the button |
| `leftIcon` | `ReactNode` | `undefined` | Icon rendered before children (replaced by spinner when `loading`) |
| `rightIcon` | `ReactNode` | `undefined` | Icon rendered after children (hidden when `loading`) |
| `fullWidth` | `boolean` | `false` | Sets `w-full` |
| `disabled` | `boolean` | `false` | Native disabled (also set automatically when `loading`) |
| `ref` | `Ref<HTMLButtonElement>` | — | Forwarded ref |

### Variants

| Variant | Visual | Use for |
|---------|--------|---------|
| `primary` | Brand-red bg, white text, brand shadow | Primary CTAs |
| `secondary` | Surface bg, border, primary text | Secondary actions |
| `ghost` | Transparent bg, muted text on hover | Toolbar / nav buttons |
| `danger` | Danger-red tinted bg + border | Destructive actions (delete, revoke) |
| `outline` | Transparent bg, border, primary text | Lower-emphasis bordered buttons |

### Size Matrix

| Size | Padding | Text | Border radius | Use for |
|------|---------|------|---------------|---------|
| `sm` | `px-3 py-1.5` | `text-sm` | `rounded-lg` | Compact table actions |
| `md` | `px-5 py-2.5` | `text-sm` | `rounded-full` | Standard CTAs (default) |
| `lg` | `px-7 py-3.5` | `text-base` | `rounded-full` | Hero / prominent actions |
| `icon` | `p-2` | — | `rounded-lg` | Icon-only toolbar buttons |

### Examples

```tsx
// Standard CTA
<Button variant="primary" onClick={handleEnroll}>Enroll Now</Button>

// Loading state
<Button variant="primary" loading={isSubmitting}>Save Changes</Button>

// With icons
<Button variant="secondary" leftIcon={<Plus size={16} />}>Add Course</Button>
<Button variant="ghost" size="icon" aria-label="Close"><X size={18} /></Button>

// Destructive
<Button variant="danger" onClick={handleDelete}>Delete Course</Button>

// Full width form submit
<Button variant="primary" fullWidth type="submit">Create Account</Button>
```

---

## Input

Labeled input with error, hint, and icon slot support.

```tsx
import { Input } from '../components';
import type { InputProps } from '../components/Input';
```

### Props

Extends all native `React.InputHTMLAttributes<HTMLInputElement>` (excluding `size` which is overridden).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `undefined` | Renders a `<label>` above the input |
| `error` | `string` | `undefined` | Renders a red error message below; also applies danger border |
| `hint` | `string` | `undefined` | Renders a muted help text below (only shown when no `error`) |
| `leadingIcon` | `ReactNode` | `undefined` | Icon in the left inset of the input field |
| `trailingIcon` | `ReactNode` | `undefined` | Icon in the right inset of the input field |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input height / padding |
| `containerClassName` | `string` | `''` | Classes applied to the outer wrapper `<div>` |
| `className` | `string` | `''` | Additional classes on the `<input>` element |
| `ref` | `Ref<HTMLInputElement>` | — | Forwarded ref |

### Size Variants

| Size | Padding | Text |
|------|---------|------|
| `sm` | `px-3 py-1.5` | `text-sm` |
| `md` | `px-3.5 py-2.5` | `text-sm` |
| `lg` | `px-4 py-3` | `text-base` |

### Examples

```tsx
// Basic labeled input
<Input label="Email" type="email" placeholder="you@example.com" />

// With validation error
<Input
  label="Password"
  type="password"
  error={errors.password}
/>

// With hint text
<Input
  label="Username"
  hint="Letters and numbers only, 3–20 characters"
/>

// With icons
<Input
  label="Search"
  leadingIcon={<Search size={16} />}
  placeholder="Search courses..."
/>

// Controlled
<Input
  label="Course title"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  error={titleError}
  size="lg"
/>
```

---

## Card

Surface container with optional header and footer slots.

```tsx
import { Card } from '../components';
import type { CardProps } from '../components/Card';
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'glass'` | `'default'` | Surface style |
| `radius` | `'lg' \| 'xl' \| '2xl' \| '3xl'` | `'2xl'` | Border radius |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Inner padding (`none` = no wrapper div around children) |
| `header` | `ReactNode` | `undefined` | Content rendered in a bordered header strip (px-6 py-4) |
| `footer` | `ReactNode` | `undefined` | Content rendered in a bordered footer strip (px-6 py-4) |
| `className` | `string` | `''` | Additional classes on the root `<div>` |
| `children` | `ReactNode` | required | Card body content |

### Variants

| Variant | Visual | Use for |
|---------|--------|---------|
| `default` | `--surface` bg + `--border` border | Standard content cards |
| `glass` | `bg-white/5` + `border-white/10` + `backdrop-blur-sm` | Hero overlays, dark-background accent cards |

### Padding Values

| Value | CSS |
|-------|-----|
| `none` | No wrapper; children render directly inside the root element |
| `sm` | `p-4` |
| `md` | `p-6` |
| `lg` | `p-8` |

### Examples

```tsx
// Standard card
<Card>
  <p>Card content</p>
</Card>

// With header and footer
<Card
  header={<h2 className="font-semibold t-text">Course Details</h2>}
  footer={<Button variant="primary" fullWidth>Enroll Now</Button>}
>
  <p className="t-text-2">Course description goes here.</p>
</Card>

// Glass card (for dark hero sections)
<Card variant="glass" radius="3xl" padding="lg">
  <h3 className="text-white font-bold text-xl">Premium</h3>
</Card>

// No padding (e.g., full-bleed image, then padded text)
<Card padding="none" radius="xl">
  <img src={thumbnail} className="w-full aspect-video object-cover" />
  <div className="p-6">
    <h3 className="t-text font-semibold">{course.title}</h3>
  </div>
</Card>
```

---

## statusToVariant() Reference

`statusToVariant(status: string): BadgeVariant` maps entity status strings from the database to the appropriate `Badge` variant. Falls back to `'default'` for any unrecognised status.

```tsx
import { Badge, statusToVariant } from '../components';

<Badge variant={statusToVariant(course.status)}>{course.status}</Badge>
```

### Full Mapping Table

| Status string | Badge variant | Visual |
|---------------|---------------|--------|
| `PUBLISHED` | `success` | Green |
| `ACTIVE` | `success` | Green |
| `captured` | `success` | Green |
| `DRAFT` | `warning` | Yellow |
| `refunded` | `warning` | Yellow |
| `REVOKED` | `danger` | Red |
| `failed` | `danger` | Red |
| `PENDING` | `info` | Blue |
| `pending` | `info` | Blue |
| `USER` | `info` | Blue |
| `EXPIRED` | `default` | Muted |
| `MODULE` | `default` | Muted |
| `ADMIN` | `brand` | Brand red |
| `BUNDLE` | `brand` | Brand red |
| *(anything else)* | `default` | Muted |

---

## When to Use Which Component

| Situation | Component | Notes |
|-----------|-----------|-------|
| Display entity status (PUBLISHED, ACTIVE, etc.) | `Badge` + `statusToVariant()` | Auto-maps all known statuses |
| Display a category tag or count pill | `Badge variant="info"` or `"brand"` | |
| Primary action (enroll, submit, save) | `Button variant="primary"` | Use `loading` during async ops |
| Secondary / cancel action | `Button variant="secondary"` | |
| Destructive action (delete, revoke) | `Button variant="danger"` | |
| Icon-only toolbar button | `Button size="icon"` | Always add `aria-label` |
| Labeled text / email / password field | `Input` with `label` + `error` | Never use raw `<input>` in forms |
| Search field | `Input` with `leadingIcon` | |
| General content container | `Card variant="default"` | |
| Hero / dark overlay card | `Card variant="glass"` | |
| Full-bleed image card | `Card padding="none"` | Wrap body content manually |
