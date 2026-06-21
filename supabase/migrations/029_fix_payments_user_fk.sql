-- ============================================
-- Migration 029: fix payments.user_id foreign key target
-- ============================================
--
-- The `payments` table (added in 006_production_gaps.sql) declared
-- `user_id ... REFERENCES auth.users(id)` — the only table that points at
-- auth.users instead of public.users. Because PostgREST embeds resources within
-- the exposed `public` schema, it cannot resolve `payments -> public.users(...)`
-- across an auth.users FK, so the admin Payments page query
-- `from('payments').select('*, users(name,email), courses(title)')`
-- fails with HTTP 400 ("Could not find a relationship between 'payments' and
-- 'users' in the schema cache") and silently shows "No payments found".
--
-- Re-point the FK to public.users(id), matching every other table. This is safe:
-- public.users.id is 1:1 with auth.users.id (created by the handle_new_user
-- trigger), and the existing auth.users FK guarantees each user_id is valid.
-- ============================================

BEGIN;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMIT;

-- Tell PostgREST to refresh its schema cache so the new relationship is usable
-- immediately (Supabase also auto-reloads on migration apply).
NOTIFY pgrst, 'reload schema';
