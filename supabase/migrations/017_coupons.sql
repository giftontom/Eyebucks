-- Migration 017: Coupons table

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_pct INTEGER NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage coupons"
  ON coupons
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Authenticated users: read active, non-expired coupons
CREATE POLICY "Users read active coupons"
  ON coupons
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses)
  );
