-- 047_course_compare_price.sql
-- Give courses the same optional strike-through "MRP" that digital assets have
-- had since 039, so the storefront can show an actual price alongside the offer
-- price ("₹4,999  ₹2,999") instead of a single number.
--
-- `price` stays the amount actually charged — every checkout, coupon and
-- upgrade-credit path keeps reading it and is deliberately untouched by this
-- migration. `compare_price` is display-only.
--
-- Mirrors digital_assets.compare_price (039_digital_assets.sql:35): INTEGER,
-- nullable, paise. The CHECK is the one thing that differs — assets have no
-- constraint, but a strike-through that is not above the real price renders as
-- either a nonsense "discount" or an invisible one, so reject it at the source.
-- The admin form validates first, so this fires only on direct DB writes.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS compare_price INTEGER;

COMMENT ON COLUMN public.courses.compare_price IS
  'Optional strike-through "MRP" in paise. Display-only; NULL = show price alone. Must exceed price.';

-- Idempotent: re-running must not fail on the existing constraint.
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_compare_price_above_price;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_compare_price_above_price
  CHECK (compare_price IS NULL OR compare_price > price);

-- No RLS change needed: policies on public.courses are row-level (status =
-- 'PUBLISHED' for anon, is_admin() for writes) and not column-scoped, so the
-- new column follows the existing grants. It is safe to expose publicly — it
-- is marketing copy, not an entitlement.

-- Verify:
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'courses' AND column_name = 'compare_price';
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'courses_compare_price_above_price';
