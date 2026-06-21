-- 032_verify_certificate_rpc.sql
-- Public certificate verification (anti-forgery): anon-callable RPC returning ONLY
-- non-sensitive fields for an EXACT certificate number. A forged certificate image is
-- meaningless if its number doesn't verify against the DB source of truth.
-- NOTE: remote dev DB was at 031 (030_authz_hardening + 031_fix_execute_grants were
-- authored on the worktree-fix-critical-high branch and are not present as files here).

CREATE OR REPLACE FUNCTION public.verify_certificate(p_cert_number text)
RETURNS TABLE (
  certificate_number text,
  student_name text,
  course_title text,
  issue_date timestamptz,
  status certificate_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.certificate_number, c.student_name, c.course_title, c.issue_date, c.status
  FROM public.certificates c
  WHERE c.certificate_number = p_cert_number
  LIMIT 1;
$$;

-- PUBLIC has EXECUTE by default; lock it down then grant explicitly (see revoke gotcha).
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.verify_certificate(text) IS
  'Public certificate verification by exact number. Returns only non-sensitive fields (name, course, issue date, status). SECURITY DEFINER; numbers are 48-bit random so non-enumerable.';
