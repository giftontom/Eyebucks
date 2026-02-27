// Eyebuckz LMS: Video Signed URL Generator
// Generates Bunny.net CDN token-authenticated HLS URLs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

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
    if ('errorResponse' in auth) return auth.errorResponse;
    const { user } = auth;

    const { videoId, moduleId } = await req.json();
    if (!videoId) {
      return errorResponse('videoId is required', corsHeaders, 400);
    }

    const supabaseAdmin = createAdminClient();
    const isAdmin = await verifyAdmin(user.id, supabaseAdmin);

    // Non-admin users must provide moduleId for enrollment verification
    if (!isAdmin && !moduleId) {
      return errorResponse('moduleId is required', corsHeaders, 400);
    }

    // If moduleId provided, verify access (enrollment or free preview)
    if (moduleId) {
      const { data: module } = await supabaseAdmin
        .from('modules')
        .select('course_id, is_free_preview')
        .eq('id', moduleId)
        .single();

      if (!module) {
        return errorResponse('Module not found', corsHeaders, 404);
      }

      if (!module.is_free_preview && !isAdmin) {
        const { data: enrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', module.course_id)
          .eq('status', 'ACTIVE')
          .maybeSingle();

        if (!enrollment) {
          return errorResponse('Not enrolled in this course', corsHeaders, 403);
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
