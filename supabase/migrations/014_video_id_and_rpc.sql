-- Migration 014: Add video_id column, atomic reorder/bundle RPCs, non-incrementing progress save

-- 1. Add video_id to modules (VU-1)
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS video_id TEXT;

-- 2. Backfill from existing video_url
UPDATE public.modules
SET video_id = substring(video_url FROM '/([a-f0-9-]{36})/playlist\.m3u8')
WHERE video_url LIKE '%/playlist.m3u8' AND video_id IS NULL;

-- 3. Atomic reorder_modules (CC-3)
CREATE OR REPLACE FUNCTION reorder_modules(p_course_id text, p_module_ids text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE i integer;
BEGIN
  FOR i IN 1..array_length(p_module_ids, 1) LOOP
    UPDATE modules SET order_index = i
    WHERE id = p_module_ids[i] AND course_id = p_course_id;
  END LOOP;
END; $$;

-- 4. Atomic set_bundle_courses (CC-4)
CREATE OR REPLACE FUNCTION set_bundle_courses(p_bundle_id text, p_course_ids text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE i integer;
BEGIN
  DELETE FROM bundle_courses WHERE bundle_id = p_bundle_id;
  FOR i IN 1..coalesce(array_length(p_course_ids, 1), 0) LOOP
    INSERT INTO bundle_courses (bundle_id, course_id, order_index)
    VALUES (p_bundle_id, p_course_ids[i], i - 1);
  END LOOP;
END; $$;

-- 5. Non-incrementing progress save (VP-4)
CREATE OR REPLACE FUNCTION save_progress_timestamp(
  p_user_id uuid, p_course_id text, p_module_id text, p_timestamp numeric DEFAULT 0
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE progress SET timestamp = p_timestamp, last_updated_at = now()
  WHERE user_id = p_user_id AND course_id = p_course_id AND module_id = p_module_id;
END; $$;
