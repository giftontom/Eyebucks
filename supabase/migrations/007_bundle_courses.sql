CREATE TABLE IF NOT EXISTS public.bundle_courses (
  bundle_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bundle_id, course_id)
);

ALTER TABLE public.bundle_courses
  ADD CONSTRAINT bundle_courses_no_self_ref CHECK (bundle_id <> course_id);

CREATE INDEX idx_bundle_courses_bundle ON public.bundle_courses(bundle_id);
CREATE INDEX idx_bundle_courses_course ON public.bundle_courses(course_id);

ALTER TABLE public.bundle_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_courses_public_read" ON public.bundle_courses
  FOR SELECT USING (true);
CREATE POLICY "bundle_courses_admin_insert" ON public.bundle_courses
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "bundle_courses_admin_update" ON public.bundle_courses
  FOR UPDATE USING (is_admin());
CREATE POLICY "bundle_courses_admin_delete" ON public.bundle_courses
  FOR DELETE USING (is_admin());
