-- Migration 018: Update course thumbnails, hero video IDs, and free preview modules
-- Replaces Unsplash placeholder images with local assets and sets hero videos for trailers

-- Update thumbnails and hero video IDs
UPDATE courses SET
  thumbnail = '/premium_courses_cover.png',
  hero_video_id = '4fb1041c-656e-4c68-b196-7edb43e815a9'
WHERE id = 'c1-masterclass';

UPDATE courses SET
  thumbnail = '/model_1.png',
  hero_video_id = 'd2c1dc81-18fe-42de-9f2b-07933f654663'
WHERE id = 'c2-scripting';

UPDATE courses SET
  thumbnail = '/model_2.png',
  hero_video_id = '88580fa8-29c4-4f53-83f8-f93962f58536'
WHERE id = 'c3-cinematography';

UPDATE courses SET
  thumbnail = '/model_3.png',
  hero_video_id = '4fb1041c-656e-4c68-b196-7edb43e815a9'
WHERE id = 'c4-editing';

-- Mark first module of each course as free preview
UPDATE modules SET is_free_preview = true
WHERE id IN ('m1', 'sc1', 'sh1', 'ed1');
