-- Migration 006: Production Gaps
-- Adds: site_content table, payments table, course soft-delete, course analytics RPC

-- ============================================
-- 1. site_content table (dynamic FAQs, testimonials, showcase)
-- ============================================

CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL CHECK (section IN ('faq', 'testimonial', 'showcase')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_site_content_section ON public.site_content(section, order_index);

-- RLS: public SELECT, admin-only INSERT/UPDATE/DELETE
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_content_public_read" ON public.site_content
  FOR SELECT USING (is_active = true);

CREATE POLICY "site_content_admin_all" ON public.site_content
  FOR ALL USING (is_admin());

-- Updated_at trigger
CREATE TRIGGER set_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed with existing hardcoded data from Storefront.tsx
INSERT INTO public.site_content (section, title, body, order_index, metadata) VALUES
  ('faq', 'Do I need expensive gear to start?', 'Absolutely not. We have dedicated modules for smartphone filmmaking and budget DSLRs. The principles of lighting and composition apply regardless of the camera.', 1, '{}'),
  ('faq', 'Is this suitable for complete beginners?', 'Yes. Our ''Zero to Hero'' bundles start with the absolute basics of ISO, Shutter Speed, and Aperture before moving into advanced color grading.', 2, '{}'),
  ('faq', 'Do I get access to the raw footage?', 'Yes! All editing courses come with 100GB+ of 6K RAW footage so you can practice grading professional clips, not just your own backyard footage.', 3, '{}'),
  ('faq', 'How does the community feedback work?', 'You upload your work to our private Discord. Verified pro instructors review your edits/stills weekly and provide video feedback.', 4, '{}'),
  ('testimonial', 'Marcus Chen', 'I was stuck charging ₹15k per video. After the ''Business of Filmmaking'' module, I landed my first ₹1.5L commercial client. The contract templates alone are worth the price.', 1, '{"role": "Freelance Director", "image": "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200"}'),
  ('testimonial', 'Sarah Williams', 'YouTube tutorials are fragmented. Eyebuckz gave me a roadmap. I stopped guessing if my lighting was right—now I know it is.', 2, '{"role": "Content Creator", "image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"}'),
  ('testimonial', 'David Okonjo', 'The DaVinci Resolve masterclass is insane. The node structures provided have saved me hours on every project.', 3, '{"role": "Colorist", "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"}'),
  ('showcase', 'Neon Nights', 'Alex K.', 1, '{"image": "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=800", "type": "Color Grading"}'),
  ('showcase', 'Urban Explorer', 'Sarah J.', 2, '{"image": "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&q=80&w=800", "type": "Cinematography"}'),
  ('showcase', 'Mountain Peak', 'Mike R.', 3, '{"image": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800", "type": "VFX"}'),
  ('showcase', 'Life', 'Emily W.', 4, '{"image": "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800", "type": "Editing"}');

-- ============================================
-- 2. payments table (transaction history, receipts, refunds)
-- ============================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'refunded', 'failed')),
  method TEXT,
  receipt_number TEXT,
  refund_id TEXT,
  refund_amount INTEGER,
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_course_id ON public.payments(course_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_razorpay_order ON public.payments(razorpay_order_id);

-- RLS: users see own payments, admins see all
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_user_read" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL USING (is_admin());

-- Updated_at trigger
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate unique receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  receipt TEXT;
BEGIN
  receipt := 'EYB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
  RETURN receipt;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Soft-delete for courses
-- ============================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Drop existing select policy and recreate with soft-delete filter
DROP POLICY IF EXISTS "courses_select" ON public.courses;
CREATE POLICY "courses_select" ON public.courses
  FOR SELECT USING (
    (status = 'PUBLISHED' AND deleted_at IS NULL) OR is_admin()
  );

-- ============================================
-- 4. Course analytics RPC
-- ============================================

CREATE OR REPLACE FUNCTION get_course_analytics(p_course_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalEnrollments', (
      SELECT COUNT(*) FROM enrollments WHERE course_id = p_course_id AND status = 'ACTIVE'
    ),
    'completionRate', (
      SELECT COALESCE(
        ROUND(AVG(CASE WHEN overall_percent >= 100 THEN 100 ELSE 0 END)::NUMERIC, 1),
        0
      )
      FROM enrollments WHERE course_id = p_course_id AND status = 'ACTIVE'
    ),
    'avgWatchTimeMinutes', (
      SELECT COALESCE(ROUND(AVG(total_watch_time) / 60.0, 1), 0)
      FROM enrollments WHERE course_id = p_course_id AND status = 'ACTIVE'
    ),
    'revenueTotal', (
      SELECT COALESCE(SUM(amount), 0) FROM payments WHERE course_id = p_course_id AND status = 'captured'
    ),
    'activeStudents30d', (
      SELECT COUNT(*) FROM enrollments
      WHERE course_id = p_course_id
        AND status = 'ACTIVE'
        AND last_accessed_at > NOW() - INTERVAL '30 days'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
