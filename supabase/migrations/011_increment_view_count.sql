-- Migration 011: Add increment_view_count RPC for atomic view count updates
CREATE OR REPLACE FUNCTION increment_view_count(
  p_user_id uuid,
  p_course_id text,
  p_module_id text,
  p_timestamp numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE progress
  SET view_count = view_count + 1,
      timestamp = p_timestamp,
      last_updated_at = now()
  WHERE user_id = p_user_id
    AND course_id = p_course_id
    AND module_id = p_module_id;
END;
$$;
