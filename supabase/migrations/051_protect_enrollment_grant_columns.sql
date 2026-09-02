-- 051_protect_enrollment_grant_columns.sql
-- Closes a paywall bypass in the enrollments UPDATE policy.
--
-- THE GAP
--   028 correctly restricted enrollments INSERT to is_admin(), so a user can no
--   longer conjure an enrollment. But enrollments_update was never revisited and
--   still reads:
--
--     CREATE POLICY enrollments_update ON enrollments FOR UPDATE
--       USING (user_id = auth.uid() OR is_admin());
--
--   It has no WITH CHECK, so Postgres reuses USING for the new row. The only
--   thing that constrains the update is that the row stays owned by the caller —
--   every other column is fair game. An authenticated user holding any single
--   enrollment (including a free one from course-claim-free) could therefore:
--
--     update enrollments set course_id = '<premium bundle>' where user_id = me
--
--   and move their entitlement onto any paid course. They could equally clear
--   expires_at to make time-limited access permanent, or flip a REVOKED row back
--   to ACTIVE — note that enrollments_select hides non-ACTIVE rows from users,
--   but the UPDATE policy's USING does not, so revocation was reversible by the
--   person it was applied to.
--
-- WHY A TRIGGER AND NOT A NARROWER POLICY
--   Users do legitimately write to this table: enrollments.api.ts updates
--   last_accessed_at and updateProgress() writes completed_lessons,
--   current_lesson, overall_percent and total_watch_time. RLS policies cannot
--   express "these columns but not those", so making the policy admin-only would
--   break normal playback. A BEFORE UPDATE trigger can, and this mirrors
--   prevent_role_change() from 022, which guards users.role the same way.
--
--   service_role bypasses RLS but NOT triggers, so the guard is written against
--   auth.uid() rather than the policy: a service-role call from an Edge Function
--   (checkout-verify, refund-process) and pg_cron's expire_enrollments() both run
--   with auth.uid() IS NULL and are unaffected.

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
