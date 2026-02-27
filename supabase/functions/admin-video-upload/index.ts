// Eyebuckz LMS: Admin Video Upload — TUS credential generator
// Phase 1: Auth + create Bunny video entry + return TUS upload credentials
// Phase 2 (client-side): Direct TUS upload to Bunny CDN, bypassing Supabase body limit

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

const BUNNY_API_BASE = 'https://video.bunnycdn.com';
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) return auth.errorResponse;
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

    // Parse JSON body (tiny — just the title + optional metadata, no file)
    const { title, fileSizeBytes, mimeType } = await req.json();
    if (!title) {
      return errorResponse('Title is required', corsHeaders, 400);
    }

    // Validate file size if provided
    if (fileSizeBytes !== undefined) {
      if (typeof fileSizeBytes !== 'number' || fileSizeBytes <= 0) {
        return errorResponse('Invalid file size', corsHeaders, 400);
      }
      if (fileSizeBytes > MAX_FILE_SIZE) {
        return errorResponse('File too large. Maximum size is 5 GB.', corsHeaders, 413);
      }
    }

    // Validate MIME type if provided
    if (mimeType !== undefined) {
      if (typeof mimeType !== 'string' || !mimeType.startsWith('video/')) {
        return errorResponse('Invalid file type. Only video files are allowed.', corsHeaders, 415);
      }
    }

    // Create video entry in Bunny
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
      return errorResponse('Failed to create video entry', corsHeaders, 500);
    }

    const videoEntry = await createResponse.json();
    const videoGuid = videoEntry.guid;

    // Generate TUS upload signature
    // Formula: SHA256(libraryId + apiKey + expirationTime + videoGuid) → lowercase hex
    const authExpire = Math.floor(Date.now() / 1000) + 7200; // 2 hours
    const signaturePayload = `${libraryId}${apiKey}${authExpire}${videoGuid}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(signaturePayload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const authSignature = Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const hlsUrl = `https://${cdnHostname}/${videoGuid}/playlist.m3u8`;
    const thumbnailUrl = `https://${cdnHostname}/${videoGuid}/thumbnail.jpg`;

    return jsonResponse({
      success: true,
      video: {
        videoId: videoGuid,
        libraryId,
        tusEndpoint: 'https://video.bunnycdn.com/tusupload',
        authSignature,
        authExpire,
        hlsUrl,
        thumbnailUrl,
      },
    }, corsHeaders);
  } catch (error) {
    console.error('[Video Upload] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
