-- Migration 033: Create the lessons table (new video-bearing leaf under modules)
--
-- New content hierarchy:  course -> modules (CHAPTER grouping) -> lessons (video leaf).
-- This migration is PURE SCHEMA: it creates the lessons table, indexes, trigger,
-- RLS, and the reorder_lessons RPC. The destructive data re-key (moving videos
-- off modules, re-pointing progress to lessons) happens in 034.
--
-- NOTE: remote dev DB carries 030_authz_hardening + 031_fix_execute_grants (authored
-- on the worktree-fix-critical-high branch, not present as files here). All new RPCs
-- follow that same hardening pattern: SECURITY DEFINER + SET search_path + REVOKE
-- FROM PUBLIC + explicit GRANT (see 032).

-- ============================================
-- LESSONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT,
  duration_seconds INTEGER DEFAULT 0,
  video_url TEXT,
  video_id TEXT,
  is_free_preview BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lessons_module ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(module_id, order_index);

-- updated_at trigger (reuses the shared update_updated_at() function from 001)
DROP TRIGGER IF EXISTS lessons_updated_at ON public.lessons;
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS (mirrors modules: visible if the parent course is published or caller is admin)
-- ============================================
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY lessons_select ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND (c.status = 'PUBLISHED' OR is_admin())
    )
  );

CREATE POLICY lessons_insert ON public.lessons FOR INSERT WITH CHECK (is_admin());
CREATE POLICY lessons_update ON public.lessons FOR UPDATE USING (is_admin());
CREATE POLICY lessons_delete ON public.lessons FOR DELETE USING (is_admin());

-- ============================================
-- reorder_lessons(p_module_id, p_lesson_ids[]) — atomic per-chapter lesson reorder
-- ============================================
CREATE OR REPLACE FUNCTION public.reorder_lessons(p_module_id text, p_lesson_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE i integer;
BEGIN
  FOR i IN 1..coalesce(array_length(p_lesson_ids, 1), 0) LOOP
    UPDATE lessons SET order_index = i
    WHERE id = p_lesson_ids[i] AND module_id = p_module_id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_lessons(text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_lessons(text, text[]) TO authenticated, service_role;
