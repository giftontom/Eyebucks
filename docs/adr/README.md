# Architecture Decision Records

> **Last updated:** 2026-03-14 | **Status:** Stable | **Scope:** Entire project

Architecture Decision Records (ADRs) document significant technical choices made during the
development of Eyebuckz LMS. Each record explains the context, options considered, and
rationale behind the decision.

## ADR Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [001](001-why-supabase.md) | Why Supabase over custom Express backend | Accepted | 2026-03-14 |
| [002](002-why-hashrouter.md) | Why HashRouter over BrowserRouter | Accepted | 2026-03-14 |
| [003](003-why-razorpay.md) | Why Razorpay for payments | Accepted | 2026-03-14 |
| [004](004-why-bunny-net.md) | Why Bunny.net for video hosting | Accepted | 2026-03-14 |
| [005](005-why-tailwind-v4.md) | Why Tailwind CSS v4 | Accepted | 2026-03-14 |

---

## ADR Template

Use this template for all new ADRs:

```markdown
# ADR-NNN: [Title]

> **Status:** Proposed | Accepted | Deprecated | Superseded
> **Date:** YYYY-MM-DD | **Deciders:** core maintainers
> **Supersedes:** N/A | **Superseded by:** N/A

## Context

[The problem or question that needed answering. Include constraints, requirements, and timeline.]

## Decision Drivers

- [Key requirement or constraint that shaped the decision]
- [Another driver]

## Options Considered

### Option A: [Name]
- Pro: ...
- Con: ...

### Option B: [Name] *(chosen)*
- Pro: ...
- Con: ...

## Decision

**We chose [Option B]** because [rationale linking back to decision drivers].

## Consequences

### Positive
- [Benefit 1]

### Negative / Trade-offs
- [Downside and its mitigation]

### Risks
- [Risk and mitigation strategy]

## Links

- [Related documentation]
- [Related known issue]
```

---

## How to Add a New ADR

1. Copy the template above
2. Number it sequentially (check the index above for the next number)
3. Name the file `NNN-kebab-case-title.md`
4. Add a row to the index table above
5. Update `docs/README.md` to reference the new ADR
