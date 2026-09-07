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

// Never sweep a video younger than this: an admin may have just uploaded it and
// not yet saved the lesson (or it may still be mid-upload / transcoding), so it
// is legitimately unreferenced for a short window.
const MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24h

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Matches GUIDs embedded anywhere in a string (e.g. inside a lesson's video_url).
const GUID_ANYWHERE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

interface BunnyVideo {
  guid: string;
  title: string;
  dateUploaded: string;
  status: number;
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

      if (typeof deleteVideoId !== 'string' || !GUID_PATTERN.test(deleteVideoId)) {
        return errorResponse('Invalid video id', corsHeaders, 400);
      }

      // Videos can be shared across lessons and course trailers (library reuse),
      // so only delete from Bunny when nothing in the DB still points at it.
      // Callers delete their own DB row first, so any remaining reference
      // belongs to someone else.
      const [lessonRefs, heroRefs, urlRefs] = await Promise.all([
        adminClient.from('lessons').select('id', { count: 'exact', head: true })
          .eq('video_id', deleteVideoId),
        adminClient.from('courses').select('id', { count: 'exact', head: true })
          .eq('hero_video_id', deleteVideoId),
        // Legacy "Enter URL" lessons store only video_url with the GUID embedded.
        adminClient.from('lessons').select('id', { count: 'exact', head: true })
          .like('video_url', `%${deleteVideoId}%`),
      ]);

      if (lessonRefs.error || heroRefs.error || urlRefs.error) {
        console.error('[VideoCleanup] Reference check error:',
          lessonRefs.error || heroRefs.error || urlRefs.error);
        return errorResponse('Reference check failed; video not deleted', corsHeaders, 500);
      }

      const totalRefs = (lessonRefs.count ?? 0) + (heroRefs.count ?? 0) + (urlRefs.count ?? 0);
      if (totalRefs > 0) {
        return jsonResponse({
          success: true,
          deleted: null,
          skipped: 'still-referenced',
          references: totalRefs,
        }, corsHeaders);
      }

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
          status: item.status ?? -1,
        });
      }

      if (items.length < itemsPerPage || page * itemsPerPage >= (data.totalItems || 0)) {
        break;
      }
      page++;
    }

    // Query all referenced video IDs from DB (videos now live on lessons, not modules)
    const { data: lessonVideoIds, error: lessonError } = await adminClient
      .from('lessons')
      .select('video_id, video_url');

    if (lessonError) {
      console.error('[VideoCleanup] Lesson query error:', lessonError);
      return errorResponse('Failed to query lessons', corsHeaders, 500);
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
    for (const row of lessonVideoIds || []) {
      if (row.video_id) {referencedIds.add(row.video_id);}
      // Legacy "Enter URL" lessons have video_id NULL but the GUID inside the URL.
      const embedded = row.video_url?.match(GUID_ANYWHERE);
      if (embedded) {referencedIds.add(embedded[0].toLowerCase());}
    }
    for (const row of courseHeroIds || []) {
      if (row.hero_video_id) {referencedIds.add(row.hero_video_id);}
    }

    // Diff: orphans = Bunny videos not referenced in DB AND older than the
    // safety window (protects just-uploaded / in-flight / unsaved videos).
    const now = Date.now();
    const orphanedVideos = allBunnyVideos.filter(v => {
      if (referencedIds.has(v.guid)) { return false; }
      if (!v.dateUploaded) { return false; } // no timestamp → don't risk deleting
      return (now - new Date(v.dateUploaded).getTime()) > MIN_ORPHAN_AGE_MS;
    });

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
        status: v.status,
      })),
      ...(dryRun ? {} : { deletedCount, failedCount }),
    }, corsHeaders);
  } catch (error) {
    console.error('[VideoCleanup] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
