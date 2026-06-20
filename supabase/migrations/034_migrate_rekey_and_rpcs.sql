-- Migration 034: Auto-wrap existing modules into lessons, re-key progress/enrollments
-- to lessons, slim the modules table to chapters, and rewrite the progress RPCs.
--
-- DESTRUCTIVE + IRREVERSIBLE: re-keys progress.module_id -> progress.lesson_id and
-- drops the video columns from modules. Back up the DB before applying.
-- The steps are ordered so a missing lesson row makes step B fail loudly (NOT NULL /
-- FK violation) rather than silently dropping progress.
--
-- AUTO-WRAP: every existing module becomes a CHAPTER holding exactly ONE lesson that
-- carries its video. Lesson id is the deterministic `<module_id> || '-l1'` so the
-- progress / enrollment re-key is a pure string derivation (no temp mapping table).

-- ============================================
-- A. Auto-wrap: copy each module's video into a single lesson (idempotent)
-- ============================================
INSERT INTO public.lessons
  (id, module_id, title, duration, duration_seconds, video_url, video_id, is_free_preview, order_index)
SELECT
  m.id || '-l1', m.id, m.title, m.duration, m.duration_seconds,
  m.video_url, m.video_id, m.is_free_preview, 1
FROM public.modules m
WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = m.id || '-l1');

-- ============================================
-- B. Re-key progress: module_id -> lesson_id (preserve every row)
-- ============================================
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS lesson_id TEXT;

-- 1:1 deterministic backfill; every module now has exactly one '-l1' lesson (step A)
UPDATE public.progress SET lesson_id = module_id || '-l1' WHERE lesson_id IS NULL;

-- Enforce + attach the new FK only after the backfill is complete
ALTER TABLE public.progress ALTER COLUMN lesson_id SET NOT NULL;
ALTER TABLE public.progress
  ADD CONSTRAINT progress_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Swap the uniqueness guard from (user, course, module) to (user, course, lesson).
-- (1 lesson per module => no duplicate tuples, so the new UNIQUE adds cleanly.)
ALTER TABLE public.progress DROP CONSTRAINT progress_user_id_course_id_module_id_key;
ALTER TABLE public.progress
  ADD CONSTRAINT progress_user_id_course_id_lesson_id_key
  UNIQUE (user_id, course_id, lesson_id);

-- Drop the old module linkage now that lesson_id protects the rows
DROP INDEX IF EXISTS idx_progress_module;
ALTER TABLE public.progress DROP CONSTRAINT progress_module_id_fkey;
ALTER TABLE public.progress DROP COLUMN module_id;
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON public.progress(lesson_id);

-- ============================================
-- C. Re-key enrollments denormalized columns: modules -> lessons
-- ============================================
ALTER TABLE public.enrollments RENAME COLUMN completed_modules TO completed_lessons;
ALTER TABLE public.enrollments RENAME COLUMN current_module    TO current_lesson;

-- Values currently hold module ids; append the deterministic lesson suffix.
UPDATE public.enrollments
SET completed_lessons = ARRAY(SELECT unnest(completed_lessons) || '-l1'),
    current_lesson    = CASE WHEN current_lesson IS NOT NULL THEN current_lesson || '-l1' END;

-- ============================================
-- D. Slim modules to chapter grouping (video now lives on lessons)
-- ============================================
ALTER TABLE public.modules DROP COLUMN IF EXISTS video_url;
ALTER TABLE public.modules DROP COLUMN IF EXISTS video_id;
ALTER TABLE public.modules DROP COLUMN IF EXISTS is_free_preview;
ALTER TABLE public.modules DROP COLUMN IF EXISTS duration;
ALTER TABLE public.modules DROP COLUMN IF EXISTS duration_seconds;

-- ============================================
-- E. RPC rewrites (all hardened: SECURITY DEFINER + search_path + grants)
-- ============================================

-- complete_lesson: marks a lesson complete, recomputes per-lesson course percentage,
-- rebuilds enrollments.completed_lessons. Returns `percent` so the certificate /
-- milestone chain in the progress-complete Edge Function is unchanged.
CREATE OR REPLACE FUNCTION public.complete_lesson(
  p_user_id UUID,
  p_lesson_id TEXT,
  p_course_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_lessons INTEGER;
  v_completed_count INTEGER;
  v_percent INTEGER;
  v_enrollment_id TEXT;
  v_lesson_ok BOOLEAN;
BEGIN
  -- Validate the lesson belongs to the course (via its module)
  SELECT EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id AND m.course_id = p_course_id
  ) INTO v_lesson_ok;

  IF NOT v_lesson_ok THEN
    RAISE EXCEPTION 'Lesson does not belong to this course';
  END IF;

  SELECT id INTO v_enrollment_id
  FROM enrollments
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'ACTIVE';

  IF v_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'No active enrollment found';
  END IF;

  -- Mark progress completed (upsert)
  UPDATE progress
  SET completed = true, completed_at = now(), last_updated_at = now()
  WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND course_id = p_course_id;

  IF NOT FOUND THEN
    INSERT INTO progress (user_id, lesson_id, course_id, completed, completed_at, last_updated_at)
    VALUES (p_user_id, p_lesson_id, p_course_id, true, now(), now())
    ON CONFLICT (user_id, course_id, lesson_id) DO UPDATE
    SET completed = true, completed_at = now(), last_updated_at = now();
  END IF;

  -- Count total + completed LESSONS across the whole course (lessons -> modules)
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons l JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id;

  SELECT COUNT(*) INTO v_completed_count
  FROM progress p
  JOIN lessons l ON l.id = p.lesson_id
  JOIN modules m ON m.id = l.module_id
  WHERE p.user_id = p_user_id AND m.course_id = p_course_id AND p.completed = true;

  IF v_total_lessons > 0 THEN
    v_percent := ROUND((v_completed_count::REAL / v_total_lessons::REAL) * 100);
  ELSE
    v_percent := 0;
  END IF;

  UPDATE enrollments
  SET completed_lessons = (
        SELECT ARRAY_AGG(DISTINCT l.id)
        FROM progress p
        JOIN lessons l ON l.id = p.lesson_id
        JOIN modules m ON m.id = l.module_id
        WHERE p.user_id = p_user_id AND m.course_id = p_course_id AND p.completed = true
      ),
      overall_percent = v_percent,
      updated_at = now()
  WHERE id = v_enrollment_id;

  RETURN jsonb_build_object(
    'completed_count', v_completed_count,
    'total_modules', v_total_lessons,   -- kept key name for Edge Function compatibility
    'total_lessons', v_total_lessons,
    'percent', v_percent,
    'enrollment_id', v_enrollment_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_lesson(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_lesson(uuid, text, text) TO authenticated, service_role;

-- Old module-based completion RPC is renamed away — drop so no stale path lingers.
DROP FUNCTION IF EXISTS public.complete_module(uuid, text, text);

-- get_progress_stats: now counts LESSONS. JSON keys are unchanged
-- (completedModules/totalModules/currentModule) so the frontend ProgressStats shape
-- is untouched — only the values' meaning shifts to lessons.
CREATE OR REPLACE FUNCTION public.get_progress_stats(p_user_id UUID, p_course_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_total_watch_time INTEGER;
  v_current_lesson TEXT;
  v_percent INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons l JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id;

  SELECT COUNT(*) INTO v_completed_lessons
  FROM progress p
  JOIN lessons l ON l.id = p.lesson_id
  JOIN modules m ON m.id = l.module_id
  WHERE p.user_id = p_user_id AND m.course_id = p_course_id AND p.completed = true;

  SELECT COALESCE(SUM(p.watch_time), 0) INTO v_total_watch_time
  FROM progress p
  JOIN lessons l ON l.id = p.lesson_id
  JOIN modules m ON m.id = l.module_id
  WHERE p.user_id = p_user_id AND m.course_id = p_course_id;

  SELECT current_lesson INTO v_current_lesson
  FROM enrollments
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'ACTIVE';

  IF v_total_lessons > 0 THEN
    v_percent := ROUND((v_completed_lessons::REAL / v_total_lessons::REAL) * 100);
  ELSE
    v_percent := 0;
  END IF;

  RETURN jsonb_build_object(
    'completedModules', v_completed_lessons,
    'totalModules', v_total_lessons,
    'overallPercent', v_percent,
    'totalWatchTime', v_total_watch_time,
    'currentModule', v_current_lesson
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_progress_stats(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_progress_stats(uuid, text) TO authenticated, service_role;

-- save_progress_timestamp: same arg shape, 3rd param now a lesson id
CREATE OR REPLACE FUNCTION public.save_progress_timestamp(
  p_user_id uuid, p_course_id text, p_lesson_id text, p_timestamp numeric DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE progress SET timestamp = p_timestamp, last_updated_at = now()
  WHERE user_id = p_user_id AND course_id = p_course_id AND lesson_id = p_lesson_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_progress_timestamp(uuid, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_progress_timestamp(uuid, text, text, numeric) TO authenticated, service_role;

-- increment_view_count: same arg shape, 3rd param now a lesson id
CREATE OR REPLACE FUNCTION public.increment_view_count(
  p_user_id uuid, p_course_id text, p_lesson_id text, p_timestamp numeric DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE progress
  SET view_count = view_count + 1,
      timestamp = p_timestamp,
      last_updated_at = now()
  WHERE user_id = p_user_id AND course_id = p_course_id AND lesson_id = p_lesson_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_view_count(uuid, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid, text, text, numeric) TO authenticated, service_role;
