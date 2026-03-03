-- Migration 012: Set Bunny.net video URLs on existing modules
-- Replaces placeholder videvo.net URLs with real Bunny Stream HLS URLs

UPDATE public.modules
SET video_url = CASE
  WHEN order_index % 2 = 1 THEN 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8'
  ELSE 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8'
END
WHERE video_url LIKE '%videvo.net%';
