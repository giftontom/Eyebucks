-- Migration 020: Wishlist / Favorites

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own wishlist entries
CREATE POLICY "Users manage own wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins view all wishlists"
  ON wishlists FOR SELECT
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists (user_id);
