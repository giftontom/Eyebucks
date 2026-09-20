-- ============================================================
--  RUN THIS FIRST — Supabase SQL editor, project pdengtcdtszpvwhedzxn
--
--  SECURITY FIX. Closes a paywall bypass: any logged-in user who
--  held a single enrollment could point it at a different course
--  and get paid content for free, extend a time-limited enrollment
--  forever, or undo an admin's revocation.
--
--  Independent of the About-page migration (050) — run either order.
--  Safe to run twice. No data is modified; it only adds a guard.
--
--  Paste the whole file. Expected: CREATE FUNCTION / CREATE TRIGGER,
--  no errors.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_enrollment_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No end-user JWT => service_role Edge Function or pg_cron. Leave it alone.
  IF auth.uid() IS NULL OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id    IS DISTINCT FROM OLD.user_id
  OR NEW.course_id  IS DISTINCT FROM OLD.course_id
  OR NEW.status     IS DISTINCT FROM OLD.status
  OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
  OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
  OR NEW.order_id   IS DISTINCT FROM OLD.order_id
  OR NEW.amount     IS DISTINCT FROM OLD.amount
  OR NEW.enrolled_at IS DISTINCT FROM OLD.enrolled_at
  THEN
    RAISE EXCEPTION 'Changing enrollment grant fields is not permitted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_enrollment_escalation ON enrollments;
CREATE TRIGGER trg_prevent_enrollment_escalation
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_enrollment_escalation();

-- Verify:
--   SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
--    WHERE c.relname = 'enrollments' AND NOT tgisinternal;
--   -- As a non-admin user, this must raise:
--   --   UPDATE enrollments SET course_id = '<other>' WHERE user_id = auth.uid();
--   -- ...while this must still succeed:
--   --   UPDATE enrollments SET last_accessed_at = now() WHERE user_id = auth.uid();

-- Read-only confirmation that the guard is installed:
SELECT tgname AS trigger_installed
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE c.relname = 'enrollments' AND NOT t.tgisinternal;
