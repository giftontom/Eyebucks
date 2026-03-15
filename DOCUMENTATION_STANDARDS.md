# DOCUMENTATION_STANDARDS

> **Last updated:** 2026-03-14 | **Status:** Stable | **Scope:** Entire project

## Table of Contents

1. [Scope and Philosophy](#1-scope-and-philosophy)
2. [Document Types](#2-document-types)
3. [File Naming Conventions](#3-file-naming-conventions)
4. [Markdown Structure Rules](#4-markdown-structure-rules)
5. [JSDoc / TSDoc Rules](#5-jsdoc--tsdoc-rules)
6. [Inline Comment Rules](#6-inline-comment-rules)
7. [Templates](#7-templates)
8. [Versioning and Maintenance](#8-versioning-and-maintenance)
9. [Contribution Process](#9-contribution-process)

---

## 1. Scope and Philosophy

This standard governs all documentation in the Eyebuckz LMS repository: Markdown docs, inline
JSDoc comments, and Edge Function documentation.

**Principle: Living documentation.** Docs are updated in the same PR as the code they describe.
A code change that leaves docs stale is an incomplete PR.

**Principle: Minimize duplication.** One authoritative source per topic. Cross-link rather than copy.

**Principle: Audience-aware writing.** Architecture docs target the next developer on the team.
Operations runbooks target an on-call engineer under pressure. Write for that reader.

---

## 2. Document Types

| Type | Location | Purpose | Audience |
|------|----------|---------|----------|
| Architecture | `docs/architecture/` | How the system is built and why | New developers, architects |
| ADR | `docs/adr/` | Why a specific technology or pattern was chosen | Decision reviewers, future maintainers |
| API Reference | `docs/api/` | Function signatures, parameters, return values | Developers using the API layer |
| Reference | `docs/reference/` | Components, hooks, design tokens, types | Developers building features |
| Guide | `docs/guides/` | How to do a specific task or follow a process | Developers learning workflows |
| Operations | `docs/operations/` | Step-by-step procedures for runtime administration | Admins, on-call engineers |
| Inline | Source files | Why non-obvious code does what it does | Developers reading code |

---

## 3. File Naming Conventions

- **All doc files:** `SCREAMING_SNAKE_CASE.md` (e.g., `DATABASE_SCHEMA.md`, `ADMIN_RUNBOOK.md`)
- **ADR files:** `NNN-kebab-case-title.md` (e.g., `001-why-supabase.md`, `005-why-tailwind-v4.md`)
- **Versioned archives:** append `_v{N}` suffix (e.g., `DATABASE_SCHEMA_v1.md`)
- **Directories:** `kebab-case` (e.g., `docs/adr/`, `docs/operations/`)

---

## 4. Markdown Structure Rules

### Required structure
- Every document starts with an H1 matching the filename topic
- Second element: a metadata blockquote with `Last updated`, `Status`, and `Scope`
- Section dividers (`---`) between H2 sections

### Heading hierarchy
- H1 → H2 → H3 → H4 only; never skip levels
- Every document over 300 words must have a Table of Contents

### Status values for metadata blockquotes
- `Stable` — reviewed, accurate, updated with every relevant code change
- `Draft` — work-in-progress; must not be linked from main README until promoted
- `Outdated` — known to be stale; fix before next release
- `Archived` — superseded; kept for history

### Code blocks
Always specify language for code blocks:
- ` ```ts ` for TypeScript
- ` ```tsx ` for React/TSX
- ` ```sql ` for SQL
- ` ```bash ` for shell commands
- ` ```json ` for JSON

### Inline formatting
Use backticks for: file paths, column names, function names, type names, env vars, CLI commands.

```
Good: The `getCourse()` function queries the `courses` table.
Bad:  The getCourse function queries the courses table.
```

---

## 5. JSDoc / TSDoc Rules

### What MUST have JSDoc

| Location | Rule |
|----------|------|
| Every exported function in `services/api/*.api.ts` | Required |
| Every exported hook in `hooks/*.ts` | Required |
| Every exported component's props interface in `components/*.tsx` | Required |
| Every Edge Function handler (the Deno `serve()` callback) | Required |
| Every non-obvious type/interface in `types/index.ts` | Required |

### What is OPTIONAL (only if non-obvious)

- Internal mapper/transformer functions
- Component internal state variables
- Simple wrappers with self-documenting names

### What should NEVER have JSDoc

- Self-documenting one-liners
- Auto-generated files (`types/supabase.ts`)
- Re-exports in barrel files (`index.ts`)

---

### JSDoc format for API functions

```ts
/**
 * One-sentence summary of what the function does and returns.
 *
 * Optional second paragraph: side effects, caching, rate limits, constraints.
 *
 * @param paramName - What it is. Include valid values or format constraints.
 * @returns What the resolved value contains (don't just echo the TypeScript type).
 * @throws {PostgrestError} Condition under which this throws.
 *
 * @example
 * ```ts
 * const course = await coursesApi.getCourse('intro-to-react');
 * ```
 */
export async function functionName(paramName: Type): Promise<ReturnType> {
```

### JSDoc format for hooks

```ts
/**
 * One-sentence summary of what the hook provides.
 *
 * Key behavior: describe auto-save intervals, subscription lifecycle, optimistic
 * updates, and cleanup on unmount if applicable.
 *
 * @param courseId - The course UUID to scope state to.
 * @returns Object with [list key return values and what each means].
 *
 * @example
 * ```tsx
 * const { progressPercent, checkCompletion } = useModuleProgress({ ... });
 * ```
 */
export function useHookName(param: Type): ReturnType {
```

### JSDoc format for component props interfaces

```ts
/**
 * Props for the [Name] component.
 *
 * [Note forwardRef requirements, context dependencies, or imperative handles if present.]
 */
interface ComponentNameProps {
  /** What this prop does and valid values or format constraints. */
  propName: Type;
  /** Optional: what undefined/omitted means. */
  optionalProp?: Type;
}
```

### JSDoc format for Edge Function handlers

```ts
/**
 * [FunctionName] Edge Function — one-sentence purpose.
 *
 * Auth: JWT required | No JWT (webhook) | JWT + admin role
 * Method: POST | GET
 *
 * Request body: { field: type, ... }
 * Response: { success: boolean, ... } | error JSON
 *
 * Side effects: [DB writes, emails sent, RPCs called]
 */
Deno.serve(async (req: Request) => {
```

---

## 6. Inline Comment Rules

### Write a comment when: the WHY is not obvious from the code

```ts
// Good: WHY
// Exponential backoff: profile load races with auth redirect on first OAuth login
await sleep(retryDelay);

// Bad: WHAT (already obvious from the code)
// Retry 3 times
for (let i = 0; i < 3; i++) {
```

### Rules

- **No trailing comments** on the same line as code — put comments on the line above
- **TODO comments** must include a GitHub issue number: `// TODO(#123): migrate to TanStack Query`
- **Workaround comments** must explain the ideal solution:

```ts
// WORKAROUND(#45): startsWith('c') heuristic used because slugs and IDs share the same
// parameter. Ideal fix: separate routes /course/:slug and /course/id/:id.
if (idOrSlug.startsWith('c')) {
```

- **Security comments** must reference the threat:

```ts
// SECURITY: Escape special chars before interpolation to prevent PostgREST filter injection.
// See KNOWN_ISSUES.md #6.
const safeSearch = escapePostgrestFilter(searchTerm);
```

---

## 7. Templates

### 7.1 Architecture / Reference Doc Template

```markdown
# DOCUMENT_TITLE

> **Last updated:** YYYY-MM-DD | **Status:** Draft | **Scope:** [subsystem]

## Table of Contents

1. [Section One](#1-section-one)

---

## 1. Section One

Content here.
```

### 7.2 Guide Template

```markdown
# GUIDE_TITLE

> **Last updated:** YYYY-MM-DD | **Status:** Draft | **Audience:** [who this is for]

## Overview

One paragraph explaining what this guide covers and when to use it.

## Prerequisites

- Prerequisite 1
- Prerequisite 2

## Steps

### Step 1: [Name]

Description.

```bash
# Command if applicable
```

**Expected result:** What you should see.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
```

### 7.3 ADR Template

See `docs/adr/README.md` for the full ADR template.

### 7.4 Operations Runbook Procedure Template

```markdown
### N.M Procedure Name

**When to use:** [Trigger condition — what event means you need this procedure]

**Steps:**
1. Navigate to [location in admin UI or Supabase dashboard]
2. [Action]
3. [Action]

**What happens:** [DB changes and what the user sees as a result]

**Verification:** [How to confirm the procedure succeeded]

**Caveats:** [Edge cases, warnings, irreversible actions]
```

---

## 8. Versioning and Maintenance

### Sync rules (applied to every PR)

| Code change | Required doc update |
|-------------|---------------------|
| New migration added | Update `docs/architecture/DATABASE_SCHEMA.md` |
| New API module added | Update `docs/api/SERVICE_MODULES.md` and `docs/README.md` |
| New Edge Function added | Update `docs/api/EDGE_FUNCTIONS.md` and `docs/README.md` |
| New hook added | Update `docs/reference/HOOKS.md` |
| New component added | Update `docs/reference/COMPONENTS.md` |
| New page added | Update pages catalog in `CLAUDE.md` |
| New known issue found | Add entry to `docs/project/KNOWN_ISSUES.md` |

### Review cadence

- **Stable** docs: reviewed quarterly (or when related code changes)
- **Draft** docs: reviewed before promotion to Stable
- **Outdated** docs: fixed before next release; never linked from README

### Ownership

There is no dedicated docs owner. The developer who makes a code change owns the corresponding
doc update. PRs that leave docs stale should be flagged in review.

---

## 9. Contribution Process

1. Read this document before writing any new docs
2. Choose the correct [document type](#2-document-types) and location
3. Copy the appropriate [template](#7-templates)
4. Write the doc or inline comment following the format rules
5. Update `docs/README.md` if you added a new file
6. Verify: `npx markdownlint <your-file>.md` passes
7. Verify: `npm run type-check` passes (for inline JSDoc changes)
