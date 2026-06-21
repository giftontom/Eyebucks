# Skills Audit & Standardization Tracker

> **Last updated:** 2026-06-04 | **Status:** Active | **Standard:** [`SKILLS_STANDARDS.md`](../../SKILLS_STANDARDS.md)

Tracks all `.claude/skills/` against the standard. 49 skills total. Generated baseline 2026-06-04.

## Summary of gaps (baseline)

| Gap | Count | Skills |
|-----|-------|--------|
| Missing YAML frontmatter / `description` | 6 | `add-auto-trigger`, `github-actions-claude`, `new-doc`, `setup-hooks`, `setup-mcp`, `update-doc` |
| Entry file not named `SKILL.md` | 2 | `new-doc` (`new-doc.md`), `update-doc` (`update-doc.md`) |
| Destructive/deploy skill missing `allowed-tools` | 8 | `deploy-frontend`, `deploy-edge-functions`, `deploy-all`, `promote-to-prod`, `rotate-secrets`, `rollback-migration`, `backup-database`, `seed-database` |
| Has `eval.md` | 0 | — |
| Body > 500 lines | 0 | — (largest: `new-doc` 315) |

## Rollout status

- **P0 (blocks discovery / lint):** add frontmatter+description to the 6; rename the 2 → `SKILL.md`. → **done in this pass.**
- **P1 (safety):** add `allowed-tools` to the 8 destructive/deploy skills (most already set `disable-model-invocation`). → **pilot in this pass.**
- **P2 (quality):** review the 43 existing descriptions for third-person "what + when"; add `eval.md` to high-use skills. → **rolling.**

## Per-skill matrix

Legend: ✓ = compliant · ✗ = needs work · — = n/a · `dmi` = `disable-model-invocation`

| Skill | SKILL.md | description | allowed-tools | dmi | eval | Notes |
|-------|:--:|:--:|:--:|:--:|:--:|-------|
| add-auto-trigger | ✓ | ✗→✓ | — | — | ✗ | frontmatter added |
| architecture-diagram | ✓ | ✓ | — | — | ✗ | |
| audit-a11y | ✓ | ✓ | — | — | ✗ | |
| audit-db-schema | ✓ | ✓ | — | — | ✗ | |
| audit-dependencies | ✓ | ✓ | — | — | ✗ | |
| audit-security | ✓ | ✓ | — | — | ✗ | |
| backup-database | ✓ | ✓ | ✗ | — | ✗ | P1: add allowed-tools + dmi |
| changelog | ✓ | ✓ | — | — | ✗ | |
| check-exposed-secrets | ✓ | ✓ | — | — | ✗ | |
| debug-trace | ✓ | ✓ | — | — | ✗ | |
| deploy-all | ✓ | ✓ | ✗ | ✓ | ✗ | P1: add allowed-tools |
| deploy-edge-functions | ✓ | ✓ | ✗ | ✓ | ✗ | P1: add allowed-tools |
| deploy-frontend | ✓ | ✓ | ✗→✓ | ✓ | ✗ | allowed-tools added |
| design-component | ✓ | ✓ | — | — | ✗ | |
| e2e-test | ✓ | ✓ | — | — | ✗ | |
| env-diff | ✓ | ✓ | — | — | ✗ | |
| erd-diagram | ✓ | ✓ | — | — | ✗ | |
| error-report | ✓ | ✓ | — | — | ✗ | |
| gen-db-types | ✓ | ✓ | ✗ | ✓ | ✗ | P1 |
| generate-course-assets | ✓ | ✓ | — | — | ✗ | |
| generate-docs | ✓ | ✓ | — | — | ✗ | |
| generate-storybook-stories | ✓ | ✓ | — | — | ✗ | |
| github-actions-review | ✓ | ✗→✓ | — | — | ✗ | renamed from github-actions-claude (reserved word); frontmatter added |
| health-check | ✓ | ✓ | — | — | ✗ | |
| inspect-rls | ✓ | ✓ | ✓ | — | ✗ | reference compliant |
| log-tail | ✓ | ✓ | — | — | ✗ | |
| new-api-service | ✓ | ✓ | — | — | ✗ | |
| new-component | ✓ | ✓ | — | — | ✗ | |
| new-doc | ✗→✓ | ✗→✓ | — | — | ✗ | renamed new-doc.md → SKILL.md |
| new-edge-function | ✓ | ✓ | — | — | ✗ | |
| new-feature | ✓ | ✓ | — | — | ✗ | |
| new-migration | ✓ | ✓ | — | — | ✓ | eval added (pilot) |
| new-page | ✓ | ✓ | — | — | ✗ | |
| new-webhook | ✓ | ✓ | — | — | ✗ | |
| perf-audit | ✓ | ✓ | — | — | ✗ | |
| pre-commit | ✓ | ✓ | — | — | ✓ | eval added (pilot) |
| promote-to-prod | ✓ | ✓ | ✗ | — | ✗ | P1: add allowed-tools + dmi |
| rls-test | ✓ | ✓ | — | — | ✗ | |
| rollback-migration | ✓ | ✓ | ✗ | — | ✗ | P1 |
| rotate-secrets | ✓ | ✓ | ✗ | — | ✗ | P1 |
| run-tests | ✓ | ✓ | — | — | ✗ | |
| seed-database | ✓ | ✓ | ✗ | — | ✗ | P1 |
| setup-hooks | ✓ | ✗→✓ | — | — | ✗ | frontmatter added |
| setup-local-dev | ✓ | ✓ | — | — | ✗ | |
| setup-mcp | ✓ | ✗→✓ | — | — | ✗ | frontmatter added |
| sync-design-tokens | ✓ | ✓ | — | — | ✗ | |
| test-coverage | ✓ | ✓ | — | — | ✗ | |
| test-visual-regression | ✓ | ✓ | — | — | ✗ | |
| update-doc | ✗→✓ | ✗→✓ | — | — | ✗ | renamed update-doc.md → SKILL.md |
