-- Migration: 023_get_review_summary_rpc
-- Description: Add get_review_summary RPC to compute average rating and distribution server-side.
--              Replaces the client-side double-fetch in reviews.api.ts that fetched up to 5000 rows.
-- Created: 2026-03-16

CREATE OR REPLACE FUNCTION get_review_summary(p_course_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_total     BIGINT;
  v_avg       NUMERIC;
  v_dist      JSONB;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(AVG(rating), 0),
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    )
  INTO v_total, v_avg, v_dist
  FROM reviews
  WHERE course_id = p_course_id;

  RETURN jsonb_build_object(
    'total',           v_total,
    'average_rating',  ROUND(v_avg, 2),
    'distribution',    v_dist
  );
END;
$$;
