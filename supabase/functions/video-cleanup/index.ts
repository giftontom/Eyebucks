// Eyebuckz LMS: Video Cleanup — Orphaned Bunny.net video detection and deletion
// Two modes:
//   1. Orphan scan: list all Bunny library videos, diff against DB, report/delete orphans
//   2. Single delete: delete one specific video by GUID (used by deleteModule)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const BUNNY_API_BASE = 'https://video.bunnycdn.com';

interface BunnyVideo {
  guid: string;
  title: string;
  dateUploaded: string;
}

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

    if (!apiKey || !libraryId) {
      return errorResponse('Video service not configured', corsHeaders, 500);
    }

    const body = await req.json();

    // Mode 2: Single video delete
    if (body.deleteVideoId) {
      const { deleteVideoId } = body;

      const deleteRes = await fetch(
        `${BUNNY_API_BASE}/library/${libraryId}/videos/${deleteVideoId}`,
        {
          method: 'DELETE',
          headers: { 'AccessKey': apiKey },
        }
      );

      if (!deleteRes.ok && deleteRes.status !== 404) {
        const errorText = await deleteRes.text();
        console.error('[VideoCleanup] Bunny delete error:', deleteRes.status, errorText);
        return errorResponse(`Failed to delete video: ${errorText}`, corsHeaders, 500);
      }

      return jsonResponse({
        success: true,
        deleted: deleteVideoId,
        wasNotFound: deleteRes.status === 404,
      }, corsHeaders);
    }

    // Mode 1: Orphan scan
    const dryRun = body.dryRun !== false; // Default to dry run

    // Paginate through all Bunny library videos
    const allBunnyVideos: BunnyVideo[] = [];
    let page = 1;
    const itemsPerPage = 100;

    while (true) {
      const listRes = await fetch(
        `${BUNNY_API_BASE}/library/${libraryId}/videos?page=${page}&itemsPerPage=${itemsPerPage}`,
        {
          method: 'GET',
          headers: { 'AccessKey': apiKey },
        }
      );

      if (!listRes.ok) {
        const errorText = await listRes.text();
        console.error('[VideoCleanup] Bunny list error:', listRes.status, errorText);
        return errorResponse(`Failed to list videos: ${errorText}`, corsHeaders, 500);
      }

      const data = await listRes.json();
      const items = data.items || [];

      for (const item of items) {
        allBunnyVideos.push({
          guid: item.guid,
          title: item.title || 'Untitled',
          dateUploaded: item.dateUploaded || '',
        });
      }

      if (items.length < itemsPerPage || page * itemsPerPage >= (data.totalItems || 0)) {
        break;
      }
      page++;
    }

    // Query all referenced video IDs from DB
    const { data: moduleVideoIds, error: moduleError } = await adminClient
      .from('modules')
      .select('video_id');

    if (moduleError) {
      console.error('[VideoCleanup] Module query error:', moduleError);
      return errorResponse('Failed to query modules', corsHeaders, 500);
    }

    const { data: courseHeroIds, error: courseError } = await adminClient
      .from('courses')
      .select('hero_video_id');

    if (courseError) {
      console.error('[VideoCleanup] Course query error:', courseError);
      return errorResponse('Failed to query courses', corsHeaders, 500);
    }

    // Build set of referenced GUIDs
    const referencedIds = new Set<string>();
    for (const row of moduleVideoIds || []) {
      if (row.video_id) {referencedIds.add(row.video_id);}
    }
    for (const row of courseHeroIds || []) {
      if (row.hero_video_id) {referencedIds.add(row.hero_video_id);}
    }

    // Diff: orphans = Bunny videos not in DB
    const orphanedVideos = allBunnyVideos.filter(v => !referencedIds.has(v.guid));

    let deletedCount = 0;
    let failedCount = 0;

    // Delete orphans if not dry run
    if (!dryRun && orphanedVideos.length > 0) {
      for (const orphan of orphanedVideos) {
        try {
          const delRes = await fetch(
            `${BUNNY_API_BASE}/library/${libraryId}/videos/${orphan.guid}`,
            {
              method: 'DELETE',
              headers: { 'AccessKey': apiKey },
            }
          );

          if (delRes.ok || delRes.status === 404) {
            deletedCount++;
          } else {
            failedCount++;
            console.error(`[VideoCleanup] Failed to delete ${orphan.guid}:`, delRes.status);
          }
        } catch (err) {
          failedCount++;
          console.error(`[VideoCleanup] Error deleting ${orphan.guid}:`, err);
        }
      }
    }

    return jsonResponse({
      success: true,
      dryRun,
      totalBunnyVideos: allBunnyVideos.length,
      referencedInDb: referencedIds.size,
      orphanedCount: orphanedVideos.length,
      orphanedVideos: orphanedVideos.map(v => ({
        guid: v.guid,
        title: v.title,
        dateUploaded: v.dateUploaded,
      })),
      ...(dryRun ? {} : { deletedCount, failedCount }),
    }, corsHeaders);
  } catch (error) {
    console.error('[VideoCleanup] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
