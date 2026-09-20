// Eyebuckz LMS: Admin Video List — browse the Bunny Stream library
// Lets the admin course editor reuse already-uploaded videos instead of
// re-uploading. Read-only; paginated; optional title search.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const BUNNY_API_BASE = 'https://video.bunnycdn.com';
const BUNNY_STATUS_FINISHED = 4;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) {return auth.errorResponse;}
    const { user } = auth;

    // Verify admin role
    const adminClient = createAdminClient();
    const isAdmin = await verifyAdmin(user.id, adminClient);
    if (!isAdmin) {
      return errorResponse('Admin access required', corsHeaders, 403);
    }

    // Get Bunny config
    const apiKey = Deno.env.get('BUNNY_STREAM_API_KEY');
    const libraryId = Deno.env.get('BUNNY_STREAM_LIBRARY_ID');
    const cdnHostname = Deno.env.get('BUNNY_STREAM_CDN_HOSTNAME');

    if (!apiKey || !libraryId || !cdnHostname) {
      return errorResponse('Video service not configured', corsHeaders, 500);
    }

    const body = await req.json().catch(() => ({}));
    const page = Math.max(1, Math.floor(Number(body.page) || 1));
    const itemsPerPage = Math.min(100, Math.max(1, Math.floor(Number(body.itemsPerPage) || 24)));
    const search = typeof body.search === 'string' ? body.search.trim() : '';

    const params = new URLSearchParams({
      page: String(page),
      itemsPerPage: String(itemsPerPage),
      orderBy: 'date',
    });
    if (search) {params.set('search', search);}

    const listRes = await fetch(
      `${BUNNY_API_BASE}/library/${libraryId}/videos?${params}`,
      {
        method: 'GET',
        headers: { 'AccessKey': apiKey },
      }
    );

    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error('[VideoList] Bunny list error:', listRes.status, errorText);
      return errorResponse('Failed to list videos', corsHeaders, 500);
    }

    const data = await listRes.json();
    const items = data.items || [];

    const videos = items.map((item: Record<string, unknown>) => {
      const guid = String(item.guid);
      const status = Number(item.status ?? -1);
      return {
        guid,
        title: (item.title as string) || 'Untitled',
        dateUploaded: (item.dateUploaded as string) || '',
        status,
        lengthSeconds: Number(item.length ?? 0),
        thumbnailUrl: `https://${cdnHostname}/${guid}/${(item.thumbnailFileName as string) || 'thumbnail.jpg'}`,
        hlsUrl: `https://${cdnHostname}/${guid}/playlist.m3u8`,
        isPlayable: status === BUNNY_STATUS_FINISHED,
      };
    });

    return jsonResponse({
      success: true,
      page,
      itemsPerPage,
      totalItems: Number(data.totalItems ?? videos.length),
      videos,
    }, corsHeaders);
  } catch (error) {
    console.error('[VideoList] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
