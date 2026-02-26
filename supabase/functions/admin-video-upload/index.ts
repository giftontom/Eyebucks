// Eyebuckz LMS: Admin Video Upload to Bunny.net Stream
// Replaces: POST /api/admin/videos/upload

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUNNY_API_BASE = 'https://video.bunnycdn.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    // Check admin role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Bunny config
    const apiKey = Deno.env.get('BUNNY_STREAM_API_KEY');
    const libraryId = Deno.env.get('BUNNY_STREAM_LIBRARY_ID');
    const cdnHostname = Deno.env.get('BUNNY_STREAM_CDN_HOSTNAME');

    if (!apiKey || !libraryId || !cdnHostname) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || 'Untitled Video';

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create video entry in Bunny
    const createResponse = await fetch(
      `${BUNNY_API_BASE}/library/${libraryId}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Video Upload] Create entry failed:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create video entry' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoEntry = await createResponse.json();
    const videoGuid = videoEntry.guid;

    // Step 2: Upload file to Bunny
    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(
      `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoGuid}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[Video Upload] Upload failed:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload video file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hlsUrl = `https://${cdnHostname}/${videoGuid}/playlist.m3u8`;
    const thumbnailUrl = `https://${cdnHostname}/${videoGuid}/thumbnail.jpg`;

    return new Response(
      JSON.stringify({
        success: true,
        video: {
          publicId: videoGuid,
          secureUrl: hlsUrl,
          url: hlsUrl,
          duration: videoEntry.length || 0,
          thumbnail: thumbnailUrl,
          format: 'hls',
          bytes: fileBuffer.byteLength,
          width: videoEntry.width || 0,
          height: videoEntry.height || 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Video Upload] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
