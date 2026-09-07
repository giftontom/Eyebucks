# August Integration Go-Live Runbook

**Branch:** `integration/aug-fixes` (PR #5) · **Project:** `eyebuckz-lms` / `pdengtcdtszpvwhedzxn`

## Overview

Lands four previously-unmerged worktree branches plus four new commits. Nothing
in it reaches users until the three steps below run **in order** — the frontend
and the Edge Function both read columns that migrations 047/048 create.

| Ships | Needs |
|---|---|
| 16:9 thumbnails, sticky-CTA overlap fix, CMS "where it renders", course thumbnail upload | frontend deploy only |
| Stale-copy flash fix (batched CMS fetch + cache hydration) | frontend deploy only |
| Course actual/offer price | **migration 047** + frontend |
| Asset delivery by external link | **migration 048** + Edge Function + frontend |
| CMS page-order + empty sections + working deep links | **migration 046** + frontend |

> ⚠️ **dev and prod are the same database.** Per `PHASE_0-4_GO_LIVE.md` there is
> one Supabase project. Applying a migration here is a production write. Take a
> backup first if the change is not additive; these three are.

## Known hazard — never run `supabase db push` on this project

The migration history table does **not** match reality, and `db push` would try
to reconcile the difference by replaying live migrations:

* remote history contains `030` and `031`, which have **no local files**;
* remote history is **missing `041`–`045`**, which *are* applied (verified: the
  `courses.language` column and `upgrade_pricing_config` table both exist live).

They were applied as raw SQL through the Management API, which does not record
history. `supabase db push --dry-run` refuses outright and suggests
`migration repair`. Repairing both discrepancies on a shared production database
in order to add three columns is a far worse trade than running the SQL
directly, which is what Step 1 does.

## Prerequisites

* `SUPABASE_ACCESS_TOKEN` (a `sbp_…` personal access token) in `.env.local`, or
  dashboard access to the SQL editor.
* Cloudflare: `wrangler whoami` resolves to *Eyebuckzwb@gmail.com's Account*.
* Optional but recommended: `npm run verify:migrations 046 047 048` — replays
  the whole migration history against a throwaway local Postgres. Needs only
  `brew install postgresql@16`; **no Docker**.

## Procedure

### Step 1 — Apply migrations 046, 047, 048

All three are additive and idempotent. Run them as **one transaction** so a
partial apply is impossible.

```bash
# Option A — SQL editor (no credentials needed)
#   Paste supabase/migrations/046_*.sql, 047_*.sql, 048_*.sql wrapped in
#   BEGIN; … COMMIT; into https://supabase.com/dashboard/project/pdengtcdtszpvwhedzxn/sql/new

# Option B — Management API (matches PHASE_0-4_GO_LIVE.md)
export SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"')
python3 - <<'PY'
import json
sql = "BEGIN;\n" + "\n".join(
    open(f"supabase/migrations/{m}.sql").read()
    for m in ("046_how_it_works_steps_section",
              "047_course_compare_price",
              "048_asset_external_url")) + "\nCOMMIT;"
open("/tmp/mig.json", "w").write(json.dumps({"query": sql}))
PY
curl -sS -X POST "https://api.supabase.com/v1/projects/pdengtcdtszpvwhedzxn/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" -H "User-Agent: eyebuckz-cli" \
  --data @/tmp/mig.json
```

Confirm before continuing — both must return **200**, not 400:

```bash
URL=$(grep -hE '^VITE_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')
KEY=$(grep -hE '^VITE_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2- | tr -d '"')
curl -so /dev/null -w "compare_price %{http_code}\n" "$URL/rest/v1/courses?select=compare_price&limit=1"       -H "apikey: $KEY"
curl -so /dev/null -w "external_url  %{http_code}\n" "$URL/rest/v1/digital_assets?select=external_url&limit=1" -H "apikey: $KEY"
```

### Step 2 — Deploy the Edge Function (only after 048)

`asset-download-url/index.ts` selects `external_url`. Deploying it before
migration 048 makes that SELECT fail, which breaks downloads **for existing
buyers of existing assets** — not just the new feature.

```bash
supabase functions deploy asset-download-url --project-ref pdengtcdtszpvwhedzxn
```

Default `verify_jwt=true` is correct here. Never use `--all`: per
`PHASE_0-4_GO_LIVE.md` it flips `progress-complete`, `checkout-webhook` and
`video-signed-url` to `verify_jwt=true` and 401s them.

### Step 3 — Deploy the frontend

```bash
npm run build
npx wrangler pages deploy dist --project-name eyebucks-dev --commit-dirty=true
```

Deploying a non-production branch yields a **preview URL**; it does not update
`dev.eyebuckz.com`, which tracks the project's production branch. Prod
(`--project-name eyebucks`) is hard-walled by a `PreToolUse` hook and needs
explicit human confirmation — see the deploy guard in `CLAUDE.md`.

## Verification

1. Storefront loads with no flash of old hero copy on a **second** visit
   (first-ever visit still shows fallbacks briefly — by design; see `b9db8bf`).
2. `/admin/content` lists every section in page order, empty ones marked
   "using built-in text", and "View on site" scrolls to the right band.
3. Admin course editor shows *Offer price* and *Actual price*; a compare price
   at or below the offer price is rejected.
4. Admin asset editor offers *Upload file | External link*.
5. A course page on mobile: the sticky Enroll bar leaves the viewport entirely
   when the main CTA is on screen (0px over the bottom nav).

## Rollback

Migrations first (drops the columns, so any compare prices or external URLs
entered since are discarded). The `storage_path` NOT NULL restore fails if any
asset was switched to link-only — convert those back to an uploaded file first.

```sql
BEGIN;
ALTER TABLE public.digital_assets DROP CONSTRAINT IF EXISTS digital_assets_one_delivery_source;
ALTER TABLE public.digital_assets DROP COLUMN IF EXISTS external_url;
ALTER TABLE public.digital_assets ALTER COLUMN storage_path SET NOT NULL;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_compare_price_above_price;
ALTER TABLE public.courses DROP COLUMN IF EXISTS compare_price;
DELETE FROM public.site_content WHERE section = 'how_it_works_steps';
-- then restore the 19-key CHECK from 036_hero_slides_section.sql
COMMIT;
```

Frontend: redeploy the previous Cloudflare Pages deployment
(`npx wrangler pages deployment list --project-name eyebucks-dev`).
