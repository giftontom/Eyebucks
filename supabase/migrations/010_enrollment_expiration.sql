-- Migration 010: Enrollment expiration enforcement
-- Auto-revokes expired enrollments via pg_cron daily job

-- Enable pg_cron extension (available on Supabase Pro+)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to expire stale enrollments
CREATE OR REPLACE FUNCTION expire_enrollments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE enrollments
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  IF expired_count > 0 THEN
    RAISE LOG '[Enrollment Expiration] Expired % enrollments', expired_count;
  END IF;

  RETURN expired_count;
END;
$$;

-- Schedule daily at 2 AM UTC
SELECT cron.schedule(
  'expire-enrollments-daily',
  '0 2 * * *',
  'SELECT expire_enrollments()'
);

COMMENT ON FUNCTION expire_enrollments IS 'Auto-revokes enrollments past their expires_at date. Runs daily via pg_cron.';
