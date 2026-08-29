#!/usr/bin/env bash
#
# Replay every migration in supabase/migrations/ against a throwaway local
# Postgres, so SQL is proven to apply before it is pointed at the real database.
#
# WHY THIS EXISTS
#   dev and prod share one Supabase database (docs/operations/PHASE_0-4_GO_LIVE.md),
#   so "apply the migration and see" is a production write. Several migrations
#   have shipped with "NOT applied — no local Postgres/Docker available" in their
#   commit message. Docker is not actually required: a Homebrew postgresql server
#   is enough, and this script drives one.
#
# WHAT IT PROVES
#   * every migration file parses and applies, in order;
#   * the resulting schema has the columns and constraints you expected;
#   * re-running the newest migrations is idempotent.
#
# WHAT IT DOES NOT PROVE
#   Supabase-managed objects (storage.*, pg_cron, auth.*) are stubbed or absent,
#   so migrations touching those are reported as EXPECTED-SKIP rather than pass.
#   It also replays the repo's seed data, not production's — a constraint that
#   passes here can still fail there if prod holds rows the repo never created.
#
# USAGE
#   scripts/verify-migrations.sh              # all migrations
#   scripts/verify-migrations.sh 046 047 048  # ...then re-run these to prove idempotency
set -euo pipefail

# Locate a Postgres install. Written as a loop rather than a globbed `ls`
# pipeline because under `set -euo pipefail` a non-matching glob would abort the
# script before it could print the friendly hint below.
if [ -z "${PGBIN:-}" ]; then
  for candidate in /opt/homebrew/opt/postgresql@* /usr/local/opt/postgresql@*; do
    [ -x "$candidate/bin/initdb" ] && PGBIN="$candidate/bin"
  done
fi
if [ -z "${PGBIN:-}" ] && command -v initdb >/dev/null 2>&1; then
  PGBIN="$(dirname "$(command -v initdb)")"
fi
if [ -z "${PGBIN:-}" ] || [ ! -x "$PGBIN/initdb" ]; then
  echo "No Postgres found. Install one:  brew install postgresql@16" >&2
  echo "(or set PGBIN=/path/to/postgres/bin)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-5599}"
trap '"$PGBIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

echo "→ initialising a scratch cluster in $WORK"
"$PGBIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
mkdir -p "$WORK/sock"
"$PGBIN/pg_ctl" -D "$WORK/data" -o "-k $WORK/sock -h '' -p $PORT" -l "$WORK/log" start >/dev/null
sleep 2

q() { "$PGBIN/psql" -h "$WORK/sock" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }

# Supabase supplies these; vanilla Postgres does not.
q -q <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE OR REPLACE FUNCTION auth.uid()  RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'anon'::text $$;
DO $$ BEGIN CREATE ROLE anon NOLOGIN;          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
SQL

# Migrations that cannot succeed against an empty scratch database because they
# seed rows referencing data only the real environment has. Listing them by name
# keeps the failure explicit rather than swallowing whole classes of error.
ENV_DEPENDENT="026_seed_bundle_courses.sql"

applied=0; skipped=0; failed=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$f")"
  if out="$(q -q -f "$f" 2>&1)"; then
    applied=$((applied + 1))
  elif echo "$out" | grep -qiE 'storage\.buckets|pg_cron|storage\.objects'; then
    # Statements before the Supabase-managed one still applied, so the tables
    # these files create are present for later migrations to build on.
    skipped=$((skipped + 1)); printf '  EXPECTED-SKIP  %-46s (Supabase-managed object; earlier statements applied)\n' "$name"
  elif echo "$ENV_DEPENDENT" | grep -qF "$name"; then
    skipped=$((skipped + 1)); printf '  EXPECTED-SKIP  %-46s (seeds rows only the real database has)\n' "$name"
  else
    failed=$((failed + 1)); printf '  FAILED         %-46s %s\n' "$name" "$(echo "$out" | grep -m1 -i error | cut -c1-100)"
  fi
done
echo "→ applied=$applied expected-skip=$skipped failed=$failed"

# Re-apply the migrations named on the command line to prove they are idempotent.
for m in "$@"; do
  file="$(ls "$ROOT"/supabase/migrations/"$m"*.sql 2>/dev/null | head -1)"
  [ -n "$file" ] || { echo "  no migration matching '$m'"; failed=$((failed + 1)); continue; }
  if q -q -f "$file" >/dev/null 2>&1; then
    printf '  IDEMPOTENT     %s\n' "$(basename "$file")"
  else
    printf '  NOT IDEMPOTENT %s\n' "$(basename "$file")"; failed=$((failed + 1))
  fi
done

[ "$failed" -eq 0 ] || { echo "✗ $failed migration(s) failed"; exit 1; }
echo "✓ all migrations applied cleanly"
