// Eyebuckz LMS: Video Signed URL Generator
// Replaces: GET /api/videos/signed-url/:id
// Generates Bunny.net CDN token-authenticated HLS URLs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateBunnySignedUrl(
  videoId: string,
  cdnHostname: string,
  tokenKey: string,
  expiresIn: number = 3600
): { signedUrl: string; expiresAt: number } {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const signedPath = `/${videoId}/playlist.m3u8`;

  // Bunny CDN Advanced Token Auth: SHA256(securityKey + signedPath + expires)
  const hashableBase = `${tokenKey}${signedPath}${expires}`;
  const encoder = new TextEncoder();
  const hashBuffer = new Uint8Array(32);

  // Use synchronous approach for Deno - use Web Crypto API
  // We need async, so this function returns a promise
  return { signedUrl: '', expiresAt: expires }; // placeholder, actual impl is async
}

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

  // Base64url encoding
  const base64 = base64Encode(hashArray);
  const token = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const signedUrl = `https://${cdnHostname}${signedPath}?token=${token}&expires=${expires}`;

  return {
    signedUrl,
    hlsUrl: signedUrl,
    expiresAt: expires,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { videoId, moduleId } = await req.json();
    if (!videoId) {
      return new Response(
        JSON.stringify({ success: false, error: 'videoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // If moduleId provided, verify access (enrollment or free preview)
    if (moduleId) {
      const { data: module } = await supabaseAdmin
        .from('modules')
        .select('course_id, is_free_preview')
        .eq('id', moduleId)
        .single();

      if (module && !module.is_free_preview) {
        // Check admin
        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        const isAdmin = userProfile?.role === 'ADMIN';

        if (!isAdmin) {
          // Check enrollment
          const { data: enrollment } = await supabaseAdmin
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', module.course_id)
            .eq('status', 'ACTIVE')
            .maybeSingle();

          if (!enrollment) {
            return new Response(
              JSON.stringify({ success: false, error: 'Not enrolled in this course' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Generate signed URL
    const cdnHostname = Deno.env.get('BUNNY_STREAM_CDN_HOSTNAME');
    const tokenKey = Deno.env.get('BUNNY_STREAM_TOKEN_KEY');

    if (!cdnHostname) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video streaming not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no token key, return unsigned URL
    if (!tokenKey) {
      const hlsUrl = `https://${cdnHostname}/${videoId}/playlist.m3u8`;
      return new Response(
        JSON.stringify({
          success: true,
          signedUrl: hlsUrl,
          hlsUrl,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await generateSignedUrlAsync(videoId, cdnHostname, tokenKey);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Video] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
