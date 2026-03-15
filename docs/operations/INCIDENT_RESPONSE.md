# INCIDENT_RESPONSE

> **Last updated:** 2026-03-14 | **Status:** Stable | **Scope:** Production operations

Playbook for diagnosing and resolving production incidents on Eyebuckz LMS.

## Table of Contents

1. [Severity Levels](#1-severity-levels)
2. [Quick Diagnosis Flowchart](#2-quick-diagnosis-flowchart)
3. [Runbooks by Symptom](#3-runbooks-by-symptom)
4. [Investigation Tools](#4-investigation-tools)
5. [Common Root Causes](#5-common-root-causes)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Post-Incident Process](#7-post-incident-process)

---

## 1. Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| **P0** | Total service unavailability | Immediate | Site blank, all users locked out, payments down |
| **P1** | Core flow broken for a segment | < 1 hour | Checkout failing, videos not loading, admin 403 |
| **P2** | Degraded experience, workaround exists | < 4 hours | Slow loads, notification bell broken, minor UI bug |
| **P3** | Cosmetic or non-critical | Next business day | Wrong date on Privacy page, minor text error |

---

## 2. Quick Diagnosis Flowchart

```
User reports problem
│
├─ "Can't log in" ─────────────────────────────── → §3.1
├─ "Payment failing / checkout broken" ──────────── → §3.2
├─ "Video not loading / black screen" ───────────── → §3.3
├─ "Admin page shows 403 / access denied" ────────── → §3.4
├─ "Site is blank / white screen" ───────────────── → §3.5
├─ "Slow load / timeout" ─────────────────────────── → §3.6
└─ Unknown → check §4 Investigation Tools, then match to §5
```

---

## 3. Runbooks by Symptom

### 3.1 "Users Can't Log In"

**Checklist:**
1. Open Supabase Dashboard → Authentication → check for recent errors
2. Check `login_attempts` table: `SELECT * FROM login_attempts WHERE success = false ORDER BY created_at DESC LIMIT 20`
3. Verify Google OAuth credentials have not expired in Supabase Auth settings
4. Check `session-enforce` Edge Function logs (3-second timeout — if it's crashing, auth will fail gracefully after 3s)
5. Try the dev login button (if `VITE_DEV_MODE=true`) to isolate OAuth vs. session issues

**Common causes:**
- Google OAuth client ID or secret expired → regenerate in Google Cloud Console + update Supabase
- `session-enforce` Edge Function deployment failed → redeploy: `supabase functions deploy session-enforce`
- Supabase Auth rate limits hit → check Supabase dashboard for rate limit errors

---

### 3.2 "Checkout / Payments Failing"

**Checklist:**
1. Check `checkout-create-order` Edge Function logs
2. Check `checkout-verify` Edge Function logs
3. Verify Razorpay API keys: `supabase secrets list | grep RAZORPAY`
4. Check Razorpay Dashboard for API errors
5. Verify VITE_RAZORPAY_KEY_ID matches the environment (test vs. live key)

**Common causes:**
- Razorpay test key used in production (or vice versa)
- Razorpay secret key not set in Supabase secrets: `supabase secrets set RAZORPAY_KEY_SECRET=...`
- `checkout-verify` HMAC mismatch — key rotation without updating secrets

---

### 3.3 "Videos Not Loading"

**Checklist:**
1. Open browser DevTools Network tab — is the HLS playlist URL returning 200 or 403?
2. If 403: signed URL generation failing → check `video-signed-url` Edge Function logs
3. If the URL contains no token query parameters: signed URL was not generated, CDN fallback is serving
4. Verify Bunny token auth setting: if token auth is enforced on Bunny but the Edge Function is down, all videos fail
5. Check `BUNNY_TOKEN_KEY` secret: `supabase secrets list | grep BUNNY`

**Common causes:**
- `video-signed-url` Edge Function not deployed or returning errors
- Bunny token key rotated without updating `BUNNY_TOKEN_KEY` secret
- HLS.js compatibility issue on older browsers (check browser console for HLS errors)

---

### 3.4 "Admin Panel Returning 403"

**Checklist:**
1. Confirm the user's `role` column is `ADMIN`: `SELECT role FROM users WHERE email = '...'`
2. Confirm `is_admin()` function returns true for this user:
   ```sql
   SELECT is_admin() FROM users WHERE id = auth.uid();
   ```
   (Run this from the Supabase SQL Editor while authenticated as the user)
3. Check that RLS policies reference `is_admin()` correctly
4. Check if a recent migration altered the `is_admin()` function definition

**Common causes:**
- User's `role` not set to `ADMIN` (see ADMIN_RUNBOOK §1.4)
- `is_admin()` function modified or dropped in a migration
- Session expired — user needs to log out and back in

---

### 3.5 "Site Is Blank / White Screen"

**Checklist:**
1. Open browser DevTools Console — look for JavaScript errors
2. Check Cloudflare Pages dashboard for deployment status
3. Check if the latest deployment built successfully: `npx wrangler pages deployment list --project-name eyebucks`
4. If React threw an error before ErrorBoundary mounted, the screen is blank — look for `TypeError` or `ReferenceError` in console
5. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars in Cloudflare Pages settings

**Common causes:**
- Build succeeded but env vars missing in Cloudflare Pages → add via Cloudflare Dashboard → Pages → Settings → Environment Variables
- JavaScript runtime error during initial render (check Sentry for the error)
- Bad deployment — rollback to previous (see §6.1)

---

### 3.6 "Site Is Slow / Timeout"

**Checklist:**
1. Run `/perf-audit` for Lighthouse scores and bundle size analysis
2. Check Supabase Dashboard → Database → Logs for slow queries (> 1s)
3. Check if the slow path is a database query or an Edge Function call
4. Check if all 11 Edge Functions are responding: run `/health-check`
5. Check Cloudflare Analytics for unusual traffic spikes

**Common causes:**
- Missing database index (see `docs/project/KNOWN_ISSUES.md`)
- N+1 query in `reviews.api.ts` (Known Issue #3) under load
- Edge Function cold start (first invocation after idle period can be 200–500ms)

---

## 4. Investigation Tools

| Tool | Access | Purpose |
|------|--------|---------|
| Supabase Dashboard → Logs | dashboard.supabase.com | Database queries, auth events, Edge Function invocations |
| Supabase Edge Function Logs | `supabase functions logs <name>` | Real-time Edge Function output |
| Cloudflare Pages Dashboard | dash.cloudflare.com | Deploy status, CDN analytics |
| Sentry | Configured in `ErrorBoundary` | Frontend JavaScript errors with stack traces |
| PostHog | Configured in `utils/analytics.ts` | User behavior, funnel analysis |
| Razorpay Dashboard | dashboard.razorpay.com | Payment status, webhook delivery logs |
| Bunny.net Dashboard | panel.bunny.net | Video delivery stats, CDN errors |
| `/health-check` skill | Claude Code | Ping all services simultaneously |
| `/log-tail` skill | Claude Code | Stream and analyze Edge Function logs |
| `/error-report` skill | Claude Code | Summarize frontend + Edge Function errors (24h) |

---

## 5. Common Root Causes

| Symptom | Likely Cause | First Fix |
|---------|-------------|-----------|
| Auth broken after secrets rotation | OAuth or session-enforce secret mismatch | `supabase secrets set` |
| Payments broken in production | Test/live Razorpay key mismatch | Check `VITE_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` |
| Video 403 errors | Bunny token key mismatch or Edge Function down | Check `BUNNY_TOKEN_KEY` secret; redeploy `video-signed-url` |
| Admin 403 | User role not set to ADMIN | Run SQL UPDATE in Supabase SQL Editor |
| White screen on load | Missing env vars in Cloudflare Pages | Add vars in CF Pages dashboard |
| Slow admin pages | N+1 reviews query or missing index | Known Issue #3; add DB index |
| Certificate not generated | `certificate-generate` Edge Function error | Check logs; manually trigger via admin |
| Enrollment not created after payment | Webhook failed; Edge Function timeout | Manually enroll (ADMIN_RUNBOOK §1.1) |

---

## 6. Rollback Procedures

### 6.1 Roll Back a Frontend Deployment

```bash
# List recent deployments
npx wrangler pages deployment list --project-name eyebucks

# Promote a previous deployment to production
npx wrangler pages deployment create --project-name eyebucks [DEPLOYMENT_ID]
```

Or via Cloudflare Dashboard → Pages → [project] → Deployments → Rollback.

### 6.2 Roll Back a Database Migration

Use the `/rollback-migration` Claude Code skill, which previews the rollback SQL before
applying it. For manual rollback:

```bash
# Preview what would be rolled back (do not apply)
supabase db diff

# Apply rollback migration
# Write a new migration that reverses the change — never run raw SQL on prod
```

> Never run `supabase db reset` in production — it drops all data.

### 6.3 Disable an Edge Function

If an Edge Function is causing errors, disable it by deploying a stub that returns a
graceful error:

```ts
// Temporary stub — replace with fix ASAP
Deno.serve(async (_req) => {
  return new Response(
    JSON.stringify({ success: false, error: 'Function temporarily disabled' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

## 7. Post-Incident Process

### Timeline Template

```markdown
## Incident: [Brief description] — [Date]

**Severity:** P0/P1/P2
**Duration:** [HH:MM] ([start time] – [end time] UTC)
**Users affected:** [number or "all"]

### Timeline
- HH:MM — Incident detected (how: monitoring alert / user report)
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Service confirmed restored

### Root Cause
[One paragraph]

### Fix Applied
[What was changed]

### Prevention
- [ ] Known issue filed or existing issue updated
- [ ] Monitoring/alert added for this failure mode
- [ ] Runbook updated (link this section to INCIDENT_RESPONSE.md)
```

### User Communication Template

```
Subject: [Eyebuckz] Service Restored — [Brief Description]

We experienced [brief description] from [start time] to [end time] UTC.

What happened: [1-2 sentences, non-technical]
Who was affected: [users who were in the middle of X]
What we did: [1 sentence]
What we're doing to prevent recurrence: [1 sentence]

We apologize for the interruption.
— Eyebuckz Team
```
