# ADR-007: Standardize Claude skills on the Agent Skills standard

> **Status:** Accepted
> **Date:** 2026-06-04 | **Deciders:** core maintainers
> **Supersedes:** N/A | **Superseded by:** N/A

## Context

The repo accumulated 49 Claude Code skills under `.claude/skills/` with inconsistent structure:
6 skills had no YAML frontmatter/`description` (so they were undiscoverable by intent), 2 used a
`<name>.md` file instead of `SKILL.md`, trigger phrases were duplicated across three places
(per-skill `triggers:`, `.claude/skills/_triggers.md`, and the CLAUDE.md auto-trigger table), only
~1 skill scoped `allowed-tools`, and one name (`github-actions-claude`) used a reserved word. There
was no written standard or automated check, so drift was unbounded.

## Decision

**Adopt Anthropic's [Agent Skills](https://code.claude.com/docs/en/skills) standard** as the project
convention, documented in [`SKILLS_STANDARDS.md`](../../SKILLS_STANDARDS.md) and enforced by
`scripts/skills-lint.mjs` (wired into `/pre-commit` and `npm run lint:skills`).

Key rules: required `name` + third-person `description` ("what + when"); entry file must be
`SKILL.md`; `name` == directory, lowercase/hyphen, no reserved words ("claude"/"anthropic"); body
< 500 lines with progressive disclosure; `allowed-tools` (+ `disable-model-invocation`) on
destructive/deploy/DB skills. The **CLAUDE.md Auto-Skill Triggers table is the single source of
truth** for proactive invocation; `triggers:` frontmatter is deprecated and `_triggers.md` removed.

## Implementation

1. Added `SKILLS_STANDARDS.md` (standard) and `docs/project/SKILLS_AUDIT.md` (per-skill tracker).
2. Added frontmatter+`description` to the 6 missing skills; renamed `new-doc.md`/`update-doc.md` →
   `SKILL.md`; renamed `github-actions-claude` → `github-actions-review` (reserved word).
3. Removed `.claude/skills/_triggers.md`; piloted `allowed-tools` on `deploy-frontend` and `eval.md`
   on `pre-commit` / `new-migration`.
4. Added `scripts/skills-lint.mjs` + `npm run lint:skills`; wired into the `/pre-commit` pipeline and
   referenced from `CONTRIBUTING.md`.

## Consequences

### Positive
- All 49 skills are discoverable (non-empty descriptions) and pass an automated standard check.
- Trigger phrases have one canonical home — drift between three copies is eliminated.

### Negative / Trade-offs
- `/github-actions-claude` is renamed to `/github-actions-review` (muscle-memory change).
- `.claude/skills/` is gitignored, so skills + the lint pass are local-only until that is revisited
  (see follow-up).

### Follow-ups
- Roll `allowed-tools` + `eval.md` out to the remaining destructive/high-use skills (tracked in `SKILLS_AUDIT.md`).
- Decide whether to un-ignore `.claude/skills/` so the standard is enforced in CI for all contributors.
- Add the `.claude/skills/**` PostToolUse reminder to `.claude/settings.json` (deferred — agent self-modification).

## Links

- [`SKILLS_STANDARDS.md`](../../SKILLS_STANDARDS.md) · [`docs/project/SKILLS_AUDIT.md`](../project/SKILLS_AUDIT.md) · `scripts/skills-lint.mjs`
