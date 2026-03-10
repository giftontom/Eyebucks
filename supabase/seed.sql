-- Eyebuckz LMS: Seed Data
-- Run after migrations to populate development data
-- Note: Users are created via Supabase Auth, so we seed courses/modules/reviews only

-- ============================================
-- COURSES
-- ============================================
INSERT INTO courses (id, slug, title, description, price, thumbnail, hero_video_id, type, status, rating, total_students, features, published_at) VALUES
(
  'c1-masterclass',
  'complete-content-creation-masterclass',
  'Complete Content Creation Masterclass',
  'A step-by-step content creation masterclass that covers the complete workflow—from generating strong ideas and planning content to shooting, editing, posting, and growing across digital platforms. Designed to bring clarity, consistency, and direction to the content creation process.',
  1499900,
  '/premium_courses_cover.png',
  '4fb1041c-656e-4c68-b196-7edb43e815a9',
  'BUNDLE',
  'PUBLISHED',
  5.0,
  4200,
  ARRAY['7-Module System', 'Niche Selection Framework', 'Monetization Roadmap'],
  now()
),
(
  'c2-scripting',
  'scripting-content-creation',
  'Content Selection & Engaging Scripts',
  'Learn how to identify viral topics and write scripts that hook viewers instantly. Master the pre-production phase.',
  349900,
  '/model_1.png',
  'd2c1dc81-18fe-42de-9f2b-07933f654663',
  'MODULE',
  'PUBLISHED',
  4.8,
  0,
  ARRAY['Viral Hook Templates', 'Story Structure', 'Notion Content Calendar'],
  now()
),
(
  'c3-cinematography',
  'fundamentals-of-cinematography',
  'Shooting: Fundamentals of Cinematography',
  'Move beyond auto mode. Understand lighting, composition, and camera settings to create cinematic footage on any device.',
  399900,
  '/model_2.png',
  '88580fa8-29c4-4f53-83f8-f93962f58536',
  'MODULE',
  'PUBLISHED',
  4.9,
  0,
  ARRAY['Lighting Guide', 'Camera Settings Cheat Sheet', 'Mobile Filmmaking'],
  now()
),
(
  'c4-editing',
  'creator-editing-workflow',
  'Creator Focused Editing Workflow',
  'Speed up your post-production. Learn efficient cutting, pacing for retention, and how to repurpose content for different platforms.',
  399900,
  '/model_3.png',
  '4fb1041c-656e-4c68-b196-7edb43e815a9',
  'MODULE',
  'PUBLISHED',
  4.7,
  0,
  ARRAY['Project Files', 'Transition Presets', 'Color Grading Basics'],
  now()
);

-- ============================================
-- BUNDLE_COURSES (link masterclass to individual courses)
-- ============================================
INSERT INTO bundle_courses (bundle_id, course_id, order_index) VALUES
('c1-masterclass', 'c2-scripting', 0),
('c1-masterclass', 'c3-cinematography', 1),
('c1-masterclass', 'c4-editing', 2);

-- ============================================
-- MODULES
-- ============================================

-- Course 1: Complete Masterclass (7 modules)
-- Distributes all 3 Bunny videos across modules
INSERT INTO modules (id, course_id, title, duration, duration_seconds, video_id, video_url, order_index, is_free_preview) VALUES
('m1', 'c1-masterclass', 'Module 1: Selecting Niche & Creating Visual Identity', '45:00', 2700, '4fb1041c-656e-4c68-b196-7edb43e815a9', 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8', 1, true),
('m2', 'c1-masterclass', 'Module 2: Selecting Content & Creating Engaging Scripts', '55:00', 3300, 'd2c1dc81-18fe-42de-9f2b-07933f654663', 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8', 2, false),
('m3', 'c1-masterclass', 'Module 3: Shooting (Fundamentals of Cinematography)', '60:00', 3600, '88580fa8-29c4-4f53-83f8-f93962f58536', 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8', 3, false),
('m4', 'c1-masterclass', 'Module 4: Creator Focused Editing Workflow', '90:00', 5400, '4fb1041c-656e-4c68-b196-7edb43e815a9', 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8', 4, false),
('m5', 'c1-masterclass', 'Module 5: Posting & Marketing Strategy', '40:00', 2400, 'd2c1dc81-18fe-42de-9f2b-07933f654663', 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8', 5, false),
('m6', 'c1-masterclass', 'Module 6: Ways to Monetise', '35:00', 2100, '88580fa8-29c4-4f53-83f8-f93962f58536', 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8', 6, false),
('m7', 'c1-masterclass', 'Module 7: Equipment Suggestions for Creators', '25:00', 1500, '4fb1041c-656e-4c68-b196-7edb43e815a9', 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8', 7, false);

-- Course 2: Scripting (4 modules)
INSERT INTO modules (id, course_id, title, duration, duration_seconds, video_id, video_url, order_index, is_free_preview) VALUES
('sc1', 'c2-scripting', 'Finding Your Content Pillars', '15:00', 900, 'd2c1dc81-18fe-42de-9f2b-07933f654663', 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8', 1, true),
('sc2', 'c2-scripting', 'The Psychology of a Hook', '12:30', 750, '88580fa8-29c4-4f53-83f8-f93962f58536', 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8', 2, false),
('sc3', 'c2-scripting', 'Scripting Frameworks (Edu vs Ent)', '20:00', 1200, '4fb1041c-656e-4c68-b196-7edb43e815a9', 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8', 3, false),
('sc4', 'c2-scripting', 'Using AI for Ideation', '10:00', 600, 'd2c1dc81-18fe-42de-9f2b-07933f654663', 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8', 4, false);

-- Course 3: Cinematography (4 modules)
INSERT INTO modules (id, course_id, title, duration, duration_seconds, video_id, video_url, order_index, is_free_preview) VALUES
('sh1', 'c3-cinematography', 'Exposure Triangle Explained', '18:00', 1080, '88580fa8-29c4-4f53-83f8-f93962f58536', 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8', 1, true),
('sh2', 'c3-cinematography', 'Composition: Rule of Thirds & Depth', '14:00', 840, '4fb1041c-656e-4c68-b196-7edb43e815a9', 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8', 2, false),
('sh3', 'c3-cinematography', 'Lighting: Key, Fill, Back', '22:00', 1320, 'd2c1dc81-18fe-42de-9f2b-07933f654663', 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8', 3, false),
('sh4', 'c3-cinematography', 'Audio: The 50% Rule', '12:00', 720, '88580fa8-29c4-4f53-83f8-f93962f58536', 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8', 4, false);

-- Course 4: Editing (4 modules)
INSERT INTO modules (id, course_id, title, duration, duration_seconds, video_id, video_url, order_index, is_free_preview) VALUES
('ed1', 'c4-editing', 'Project Organization & Binning', '10:00', 600, '4fb1041c-656e-4c68-b196-7edb43e815a9', 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8', 1, true),
('ed2', 'c4-editing', 'The J-Cut and L-Cut Technique', '08:00', 480, 'd2c1dc81-18fe-42de-9f2b-07933f654663', 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8', 2, false),
('ed3', 'c4-editing', 'Pacing for Retention', '15:00', 900, '88580fa8-29c4-4f53-83f8-f93962f58536', 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8', 3, false),
('ed4', 'c4-editing', 'Export Settings for Social Media', '08:00', 480, '4fb1041c-656e-4c68-b196-7edb43e815a9', 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8', 4, false);
