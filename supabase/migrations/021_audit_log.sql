-- Migration 021: Admin Audit Log
-- Tracks every mutating admin action for accountability.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  action          text NOT NULL,                -- e.g. 'course.publish', 'user.role_change', 'refund.process'
  entity_type     text NOT NULL,                -- e.g. 'course', 'user', 'payment', 'certificate'
  entity_id       text,                         -- UUID or other identifier of the affected record
  old_value       jsonb,                        -- snapshot before the change (nullable)
  new_value       jsonb,                        -- snapshot after the change (nullable)
  metadata        jsonb DEFAULT '{}'::jsonb,    -- extra context (IP, reason, etc.)
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookup by admin and by entity
CREATE INDEX idx_audit_logs_admin_id   ON public.audit_logs (admin_id);
CREATE INDEX idx_audit_logs_entity     ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- RLS: only admins can read; service_role can insert (via Edge Functions / API)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (is_admin());

-- No INSERT policy for regular users — writes go through service_role (admin API)
