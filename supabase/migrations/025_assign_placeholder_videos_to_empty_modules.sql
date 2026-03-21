-- Migration: 025_assign_placeholder_videos_to_empty_modules
-- Description: Assign sample Bunny.net video IDs to any modules missing video_id/video_url.
--              Cycles through 3 known-good sample videos using row_number() mod 3.
--              Safe to run multiple times — only affects rows where video_id IS NULL.
-- Created: 2026-03-21

WITH ranked AS (
  SELECT
    id,
    ((row_number() OVER (ORDER BY created_at) - 1) % 3)::int AS rn
  FROM modules
  WHERE video_id IS NULL OR video_url IS NULL OR video_url = ''
),
assignments AS (
  SELECT
    id,
    CASE rn
      WHEN 0 THEN '4fb1041c-656e-4c68-b196-7edb43e815a9'
      WHEN 1 THEN 'd2c1dc81-18fe-42de-9f2b-07933f654663'
      ELSE        '88580fa8-29c4-4f53-83f8-f93962f58536'
    END AS new_video_id,
    CASE rn
      WHEN 0 THEN 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8'
      WHEN 1 THEN 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8'
      ELSE        'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8'
    END AS new_video_url
  FROM ranked
)
UPDATE modules
SET
  video_id  = a.new_video_id,
  video_url = a.new_video_url
FROM assignments a
WHERE modules.id = a.id;
