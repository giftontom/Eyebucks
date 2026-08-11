# Go-Live Runbook — Phases 0–4 (branch `ui-ux-phase-0-2`)

**Scope:** deploys the 7 feature commits `16c6f28..48fe216` — repo stabilization + security hotfix (0), 2GB/modal uploads (BC), assets-in-bundles (D), hero+trailer video (E), and upgrade pricing (A).

**Nothing here is live yet.** Everything is committed locally; this runbook applies the 4 migrations, deploys 9 edge functions, ships the frontend to dev, and pushes the branch.

> **Context:** dev and prod share ONE Supabase DB (`pdengtcdtszpvwhedzxn`), pre-launch, no real paying users. All 4 migrations are additive or verified-safe for the currently-deployed frontend. Run each step from the repo root. Prefix with `!` to run in-session, or paste into a terminal.

---

## 0. Pre-flight

```bash
! cd "/Users/apple/Documents/Project Eybuckz/Eyebucks" && git status --porcelain | wc -l   # expect 0 (clean)
! cd "/Users/apple/Documents/Project Eybuckz/Eyebucks" && npm run type-check && npm run lint && npm run build   # expect all pass
```

Optional but recommended (shared DB): `/backup-database` before applying migrations.

Confirm the Supabase token is exported (from project memory / `.env.local`):
```bash
! export SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"'); echo "token set: ${SUPABASE_ACCESS_TOKEN:0:8}…"
```

---

## 1. Apply migrations 042 → 045 (IN ORDER)

⚠️ Use **curl with a User-Agent** — python `urllib` hits Cloudflare 1010. Encode the SQL as JSON with python3 (reliable; no `jq` dependency).

Run this once per file, in order (`042`, `043`, `044`, `045`):

```bash
! cd "/Users/apple/Documents/Project Eybuckz/Eyebucks"; export SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"'); for m in 042_security_hardening 043_bundle_assets 044_upgrade_pricing 045_coupon_reissue; do echo "=== applying $m ==="; python3 -c "import json,sys; open('/tmp/mig.json','w').write(json.dumps({'query':open('supabase/migrations/'+sys.argv[1]+'.sql').read()}))" "$m"; curl -sS -X POST "https://api.supabase.com/v1/projects/pdengtcdtszpvwhedzxn/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -H "User-Agent: eyebuckz-cli" --data @/tmp/mig.json; echo; done
```

An empty `[]` (or `{}`) per file = success (no rows returned).

### 1a. Verify (paste each; check the expected column values)

```bash
! export SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"'); python3 -c "import json; open('/tmp/v.json','w').write(json.dumps({'query':\"SELECT p.oid::regprocedure::text fn, has_function_privilege('anon',p.oid,'EXECUTE') anon, has_function_privilege('authenticated',p.oid,'EXECUTE') auth, has_function_privilege('service_role',p.oid,'EXECUTE') svc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('apply_coupon','apply_asset_coupon','set_bundle_courses','set_bundle_assets','reorder_modules','reorder_lessons','get_upgrade_quote','apply_upgrade_credit') ORDER BY 1\"}))"; curl -sS -X POST "https://api.supabase.com/v1/projects/pdengtcdtszpvwhedzxn/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -H "User-Agent: eyebuckz-cli" --data @/tmp/v.json
```

Expected:
- `apply_coupon`, `apply_asset_coupon`, `apply_upgrade_credit` → anon **f**, auth **f**, svc **t**
- `set_bundle_courses`, `set_bundle_assets`, `reorder_modules`, `reorder_lessons` → anon **f**, auth **t**, svc **t**
- `get_upgrade_quote` → anon **f**, auth **t**, svc **t**

Also confirm the config row and dropped coupon policy:
```bash
! export SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"'); python3 -c "import json; open('/tmp/v2.json','w').write(json.dumps({'query':\"SELECT (SELECT count(*) FROM upgrade_pricing_config WHERE enabled) cfg, (SELECT count(*) FROM pg_policies WHERE tablename='coupons') coupon_policies, (SELECT relrowsecurity FROM pg_class WHERE relname='bundle_assets') ba_rls, (SELECT relrowsecurity FROM pg_class WHERE relname='upgrade_credits_applied') uca_rls\"}))"; curl -sS -X POST "https://api.supabase.com/v1/projects/pdengtcdtszpvwhedzxn/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -H "User-Agent: eyebuckz-cli" --data @/tmp/v2.json
```
Expected: `cfg`=1, `coupon_policies`=1 (only "Admins manage coupons"), `ba_rls`=t, `uca_rls`=t.

Then run `/rls-test bundle_assets` and `/rls-test upgrade_credits_applied`.

---

## 2. Deploy edge functions (order matters for the money path)

Auth: `supabase login --token $SUPABASE_ACCESS_TOKEN` (or `SUPABASE_ACCESS_TOKEN` env). **Never `supabase functions deploy --all`** — it would flip `progress-complete`/`checkout-webhook`/`video-signed-url` to `verify_jwt=true` and 401 them.

```bash
! cd "/Users/apple/Documents/Project Eybuckz/Eyebucks"
# money path — verify understands the new notes BEFORE create stamps them:
! supabase functions deploy checkout-verify --project-ref pdengtcdtszpvwhedzxn
! supabase functions deploy checkout-webhook --no-verify-jwt --project-ref pdengtcdtszpvwhedzxn   # ⚠️ --no-verify-jwt REQUIRED
! supabase functions deploy checkout-create-order --project-ref pdengtcdtszpvwhedzxn
! supabase functions deploy course-claim-free --project-ref pdengtcdtszpvwhedzxn                  # new (verify_jwt=true)
! supabase functions deploy refund-process --project-ref pdengtcdtszpvwhedzxn
# video / uploads:
! supabase functions deploy admin-video-upload --project-ref pdengtcdtszpvwhedzxn
! supabase functions deploy video-cleanup --project-ref pdengtcdtszpvwhedzxn
! supabase functions deploy admin-image-upload --project-ref pdengtcdtszpvwhedzxn
! supabase functions deploy video-signed-url --no-verify-jwt --project-ref pdengtcdtszpvwhedzxn    # ⚠️ --no-verify-jwt REQUIRED
```

---

## 3. Deploy frontend to DEV

```bash
! cd "/Users/apple/Documents/Project Eybuckz/Eyebucks" && npm run build && npx wrangler pages deploy dist --project-name eyebucks-dev --branch main --commit-dirty=true
```

⚠️ **NEVER** `--project-name eyebucks` (production) without explicit same-turn confirmation — the PreToolUse hook blocks it.

---

## 4. Push the branch (backup — never pushed)

```bash
! cd "/Users/apple/Documents/Project Eybuckz/Eyebucks"   # run /check-exposed-secrets first
! cd "/Users/apple/Documents/Project Eybuckz/Eyebucks" && git push -u origin ui-ux-phase-0-2
```
`.env.local` is gitignored (verified). Repo is shared with collaborators, so confirm before pushing.

---

## 5. Smoke tests on dev.eyebuckz.com

- **Trailer (anon):** open a PUBLISHED course page logged-out → hero trailer plays. A DRAFT course / random GUID → poster only (no error spam).
- **Hero video:** /admin/content → add a video to a hero slide → storefront carousel plays it (muted loop).
- **Uploads:** admin lesson video upload > 500MB (e.g. 800MB) succeeds; close the lesson modal mid-upload → prompts to confirm cancel.
- **Bundle assets:** admin ticks an asset into a bundle; buy the bundle (Razorpay TEST) → asset appears in the buyer's Library. Also test the webhook path (close the tab pre-verify).
- **Upgrade pricing:** as a user who owns a module course, open its parent BUNDLE → "You've already paid ₹X" banner + discounted price. Buy → charged the discount. If credit ≥ price → free-claim path.
- **Coupon re-issue:** apply a coupon, abandon checkout, re-apply → no "already used" lockout.
- **Refund:** refund a bundle → member courses + assets revoked; refunding a credit-source payment is blocked (409) unless forced.

---

## Rollback

- **Frontend:** redeploy the previous CF Pages build (dashboard → Deployments → previous → Rollback), or `git checkout <prev> -- dist` and re-deploy.
- **Edge functions:** redeploy the previous version from `git` (`git stash`/checkout the prior commit for that function, deploy, restore) — the pre-`8e5e4ae` versions are now in git history.
- **Migrations (reverse SQL, if ever needed):**
  - 045: `DROP FUNCTION apply_coupon(text,uuid,text); DROP FUNCTION apply_asset_coupon(text,uuid,text);` then re-create the 018/040 bodies; `ALTER TABLE coupon_uses DROP COLUMN consumed_at, DROP COLUMN order_id;`
  - 044: `DROP FUNCTION apply_upgrade_credit(uuid,text,integer,text); DROP FUNCTION get_upgrade_quote(text,uuid); DROP TABLE upgrade_credits_applied; DROP TABLE upgrade_pricing_config;`
  - 043: `DROP FUNCTION set_bundle_assets(text,text[]); DROP TABLE bundle_assets;`
  - 042: hardest to reverse (re-grants) — additive security; leave in place. To disable upgrade pricing without rollback: `UPDATE upgrade_pricing_config SET enabled=false;`
- **Kill switch (no redeploy):** `UPDATE upgrade_pricing_config SET enabled=false;` turns off all upgrade quotes instantly.

---

## Deferred / follow-up (not in these commits)

- **Coupon product-scoping** — coupons aren't course-scoped; a 100% coupon on an expensive course is clamped to a ₹1 charge (never free-claimed) as a safeguard. Proper fix = add an applies-to scope. (From the Phase 4 security review.)
- **B5 (.mkv upload)** — needs a real-file test against the live Bunny account first.
- **C7 (background uploads that survive modal close)** — optional Phase-2.
- **E: YouTube/Vimeo hero embeds** — deferred (CSP frame-src + carousel-in-iframe); direct-file/Bunny URLs supported today.
- **`types/supabase.ts` regeneration** — hand-maintained; run `/gen-db-types` when Docker is available to reconcile.
- **`refund-process` per-order asset grant ledger** — a directly+bundle-owned asset over-revokes on refund (documented in-code, narrow).
