// Eyebuckz LMS: Video Signed URL Generator
// Generates Bunny.net CDN token-authenticated HLS URLs

import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

async function generateSignedUrlAsync(
  videoId: string,
  cdnHostname: string,
  tokenKey: string,
  expiresIn: number = 3600
): Promise<{ signedUrl: string; hlsUrl: string; expiresAt: number }> {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const signedPath = `/${videoId}/playlist.m3u8`;
  const hashableBase = `${tokenKey}${signedPath}${expires}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(hashableBase);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  const base64 = base64Encode(hashArray);
  const token = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const signedUrl = `https://${cdnHostname}${signedPath}?token=${token}&expires=${expires}`;

  return { signedUrl, hlsUrl: signedUrl, expiresAt: expires };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) {return auth.errorResponse;}
    const { user } = auth;

    const { videoId, lessonId } = await req.json();
    if (!videoId) {
      return errorResponse('videoId is required', corsHeaders, 400);
    }

    const supabaseAdmin = createAdminClient();
    const isAdmin = await verifyAdmin(user.id, supabaseAdmin);

    // Non-admin users must provide lessonId for enrollment verification
    if (!isAdmin && !lessonId) {
      return errorResponse('lessonId is required', corsHeaders, 400);
    }

    // If lessonId provided, verify access (enrollment or free preview).
    // Videos now live on lessons; resolve the parent course via the lesson's module.
    if (lessonId) {
      const { data: lesson } = await supabaseAdmin
        .from('lessons')
        .select('is_free_preview, video_url, modules(course_id)')
        .eq('id', lessonId)
        .single();

      if (!lesson) {
        return errorResponse('Lesson not found', corsHeaders, 404);
      }

      // modules(course_id) is an embedded object (single FK); normalize to a scalar.
      const moduleRel = (lesson as { modules?: { course_id: string } | { course_id: string }[] }).modules;
      const courseId = Array.isArray(moduleRel) ? moduleRel[0]?.course_id : moduleRel?.course_id;

      // Validate that the requested videoId exactly matches this lesson's video GUID
      const extractGuid = (url: string) =>
        url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1] ?? null;
      const storedGuid = lesson.video_url ? extractGuid(lesson.video_url) : null;
      if (!isAdmin && storedGuid !== videoId) {
        return errorResponse('Video does not belong to this lesson', corsHeaders, 403);
      }

      if (!lesson.is_free_preview && !isAdmin) {
        if (!courseId) {
          return errorResponse('Lesson is not linked to a course', corsHeaders, 403);
        }
        const { data: enrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id, expires_at')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('status', 'ACTIVE')
          .maybeSingle();

        if (!enrollment) {
          return errorResponse('Not enrolled in this course', corsHeaders, 403);
        }

        // Real-time expiry check (pg_cron runs once daily; enforce here immediately)
        if (enrollment.expires_at && new Date(enrollment.expires_at) < new Date()) {
          return errorResponse('Enrollment has expired', corsHeaders, 403);
        }
      }
    }

    const cdnHostname = Deno.env.get('BUNNY_STREAM_CDN_HOSTNAME');
    const tokenKey = Deno.env.get('BUNNY_STREAM_TOKEN_KEY');

    if (!cdnHostname) {
      return errorResponse('Video streaming not configured', corsHeaders, 500);
    }
    if (!tokenKey) {
      return errorResponse('Video streaming token not configured', corsHeaders, 500);
    }

    const result = await generateSignedUrlAsync(videoId, cdnHostname, tokenKey);
    return jsonResponse({ success: true, ...result }, corsHeaders);
  } catch (error) {
    console.error('[Video] Error:', error);
    return errorResponse('Internal server error', getCorsHeaders(req), 500);
  }
});
