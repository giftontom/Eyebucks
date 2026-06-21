# SKILLS_STANDARDS

> **Last updated:** 2026-06-04 | **Status:** Stable | **Scope:** `.claude/skills/`

How to author and maintain Claude Code skills in this repo. Derived from Anthropic's official
[Agent Skills](https://code.claude.com/docs/en/skills) standard and
[skill-authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
Enforced by `scripts/skills-lint.mjs` (runs in `/pre-commit`).

## Table of Contents
1. [File layout](#1-file-layout)
2. [Frontmatter](#2-frontmatter)
3. [Writing the description](#3-writing-the-description)
4. [Body content](#4-body-content)
5. [allowed-tools policy](#5-allowed-tools-policy)
6. [Triggers — single source of truth](#6-triggers--single-source-of-truth)
7. [Evaluations](#7-evaluations)
8. [Checklist](#8-checklist)

---

## 1. File layout

Each skill lives in its own directory; the entry file **must** be named `SKILL.md`:

```
.claude/skills/<skill-name>/
├── SKILL.md          # required — frontmatter + instructions (< 500 lines)
├── eval.md           # optional — 3+ evaluation scenarios
└── reference/        # optional — supporting files, loaded on demand
    └── *.md
```

- `<skill-name>` is lowercase, hyphenated, and **must equal** the `name` frontmatter field.
- Supporting reference files are linked from `SKILL.md` **one level deep** (don't nest references). Use forward slashes in all paths.

## 2. Frontmatter

YAML frontmatter at the very top. **Required:** `name`, `description`.

```yaml
---
name: new-migration                 # ≤64 chars, [a-z0-9-] only, no "claude"/"anthropic"; == dir name
description: Creates an auto-numbered Supabase SQL migration ... Use when the user wants to add a table, column, index, or RLS change.
user-invocable: true                # this repo's extension — true if the user can type /name
disable-model-invocation: true      # set on destructive/deploy skills so only the user can trigger them
allowed-tools: Read, Edit, Bash     # scope the tools the skill may use (see §5)
arguments:                          # this repo's extension — documents positional/flag args
  - name: description
    description: Short migration description
    required: true
---
```

- **Required** (Anthropic standard): `name`, `description`.
- **Optional (Claude Code):** `disable-model-invocation`, `allowed-tools`.
- **Repo extensions (allowed):** `user-invocable`, `arguments`. The `triggers:` field is **deprecated** — see §6.
- Do not use XML tags or reserved words ("claude", "anthropic") in `name`/`description`.

## 3. Writing the description

The `description` is how Claude discovers the skill among 50+ others — it is the single most important field.

- **Third person.** "Creates a migration…", never "I create…" or "You can use this to…".
- **What + when.** State what it does *and* the triggering context. Include key terms a user would say.
- Non-empty, ≤1024 chars. One sentence or two.

| Good | Bad |
|------|-----|
| `Runs the full CI pipeline (lint, type-check, test, build). Use before committing or merging.` | `Helps with CI` |
| `Deploys the frontend to Cloudflare Pages. Use when shipping to dev or prod.` | `I can deploy the site` |

## 4. Body content

- Keep `SKILL.md` body **under 500 lines**. Split long reference material into `reference/*.md` and link to it.
- Assume Claude is capable — only add context Claude doesn't already have. Every line should justify its tokens.
- Match the **degree of freedom** to the task: high freedom (prose steps) for judgement tasks; low freedom (exact commands, "run exactly this") for fragile/destructive ones.
- Use consistent terminology and concrete examples. Avoid time-sensitive statements (use an "Old patterns" section instead).
- Prefer a small script for deterministic, repeated operations over prose Claude must re-derive.

## 5. allowed-tools policy

Scope tools to the minimum a skill needs. **Required** on destructive or outward-facing skills:
`deploy-frontend`, `deploy-edge-functions`, `deploy-all`, `promote-to-prod`, `rotate-secrets`,
`rollback-migration`, `backup-database`, `seed-database`, `gen-db-types`.

These same skills should also set `disable-model-invocation: true` so only the user can trigger them.
Read-only/reporting skills (`health-check`, `error-report`, audits) may omit `allowed-tools` but are encouraged to set it.

## 6. Triggers — single source of truth

Trigger phrases were historically duplicated in three places (per-skill `triggers:`,
`.claude/skills/_triggers.md`, and the CLAUDE.md **Auto-Skill Triggers** table). This causes drift.

**Canonical source = the `## Auto-Skill Triggers` table in `CLAUDE.md`.** That table is what Claude
follows for proactive invocation. To add a rule, use `/add-auto-trigger`.

- A strong `description` (§3) handles native discovery; the CLAUDE.md table handles deterministic auto-invocation.
- The `triggers:` frontmatter field is **deprecated** — leave existing ones (harmless) but do not add new ones.
- `.claude/skills/_triggers.md` is removed (its content lived in the CLAUDE.md table).

## 7. Evaluations

Per Anthropic guidance, build evals before extensive docs. For non-trivial skills add `eval.md` with **3+ scenarios**:

```markdown
## Scenario: <name>
- **Query:** <what the user says>
- **Expected behavior:**
  - <observable outcome 1>
  - <observable outcome 2>
```

## 8. Checklist

Before merging a new/changed skill:
- [ ] Directory contains `SKILL.md` (not `<name>.md`); `name` == directory name
- [ ] `name` is lowercase/hyphen, ≤64 chars, no reserved words
- [ ] `description` is third person, non-empty, says what + when
- [ ] Body < 500 lines; references one level deep; forward slashes
- [ ] `allowed-tools` (+ `disable-model-invocation`) set if destructive/deploy/DB (§5)
- [ ] No new `triggers:`; trigger rule added to CLAUDE.md via `/add-auto-trigger` if needed
- [ ] `node scripts/skills-lint.mjs` passes
