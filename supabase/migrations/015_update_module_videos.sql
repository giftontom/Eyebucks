-- Update all module video references to the new Bunny.net sample video
-- Video: "Eyebuckz Sample Course Video" (uploaded to Bunny.net Stream)

UPDATE public.modules
SET video_id = '4fb1041c-656e-4c68-b196-7edb43e815a9',
    video_url = 'https://vz-fec6a02b-81b.b-cdn.net/4fb1041c-656e-4c68-b196-7edb43e815a9/playlist.m3u8'
WHERE course_id IN ('c1-masterclass', 'c2-scripting', 'c3-cinematography', 'c4-editing');
