-- Distribute all 3 Bunny.net videos across course modules
-- Video 1: 4fb1041c-656e-4c68-b196-7edb43e815a9 (Eyebuckz Sample Course Video, 60s)
-- Video 2: d2c1dc81-18fe-42de-9f2b-07933f654663 (WhatsApp Video, 8s)
-- Video 3: 88580fa8-29c4-4f53-83f8-f93962f58536 (YASYA Segment, 5s)

-- Course 1: Masterclass - rotate all 3 videos
UPDATE public.modules SET video_id = 'd2c1dc81-18fe-42de-9f2b-07933f654663', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8' WHERE id = 'm2';
UPDATE public.modules SET video_id = '88580fa8-29c4-4f53-83f8-f93962f58536', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8' WHERE id = 'm3';
UPDATE public.modules SET video_id = 'd2c1dc81-18fe-42de-9f2b-07933f654663', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8' WHERE id = 'm5';
UPDATE public.modules SET video_id = '88580fa8-29c4-4f53-83f8-f93962f58536', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8' WHERE id = 'm6';

-- Course 2: Scripting - distribute videos
UPDATE public.modules SET video_id = 'd2c1dc81-18fe-42de-9f2b-07933f654663', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8' WHERE id = 'sc1';
UPDATE public.modules SET video_id = '88580fa8-29c4-4f53-83f8-f93962f58536', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8' WHERE id = 'sc2';
UPDATE public.modules SET video_id = 'd2c1dc81-18fe-42de-9f2b-07933f654663', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8' WHERE id = 'sc4';

-- Course 3: Cinematography - distribute videos
UPDATE public.modules SET video_id = '88580fa8-29c4-4f53-83f8-f93962f58536', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8' WHERE id = 'sh1';
UPDATE public.modules SET video_id = 'd2c1dc81-18fe-42de-9f2b-07933f654663', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8' WHERE id = 'sh3';
UPDATE public.modules SET video_id = '88580fa8-29c4-4f53-83f8-f93962f58536', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8' WHERE id = 'sh4';

-- Course 4: Editing - distribute videos
UPDATE public.modules SET video_id = 'd2c1dc81-18fe-42de-9f2b-07933f654663', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/d2c1dc81-18fe-42de-9f2b-07933f654663/playlist.m3u8' WHERE id = 'ed2';
UPDATE public.modules SET video_id = '88580fa8-29c4-4f53-83f8-f93962f58536', video_url = 'https://vz-fec6a02b-81b.b-cdn.net/88580fa8-29c4-4f53-83f8-f93962f58536/playlist.m3u8' WHERE id = 'ed3';
