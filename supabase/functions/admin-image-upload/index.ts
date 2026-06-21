// Eyebuckz LMS: Admin Image Upload — Bunny Storage proxy
// Admin-gated. Proxies a CMS image (<= 5MB) to a Bunny Storage Zone using the
// server-side storage key, and returns the public Pull-Zone CDN URL. Images are
// small, so (unlike the video TUS path) a server-side proxy is simplest and
// keeps the Bunny storage key off the client.
//
// POST multipart/form-data { file, folder }     -> { success, url, path }
// POST application/json     { action:'delete', path } -> { success, deleted }
//
// Required secrets (supabase secrets set):
//   BUNNY_STORAGE_ZONE_NAME      e.g. eyebuckz-cms
//   BUNNY_STORAGE_API_KEY        the Storage Zone password (NOT the Stream key)
//   BUNNY_STORAGE_CDN_HOSTNAME   the linked Pull Zone host, e.g. eyebuckz-cms.b-cdn.net
//   BUNNY_STORAGE_HOST           optional, default storage.bunnycdn.com (regional: sg./ny./la....)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/** Strip leading slashes and reject path traversal; only allow our folder/uuid.ext shape. */
function sanitizePath(raw: string): string | null {
  const p = String(raw).replace(/^\/+/, '');
  if (!p || p.includes('..') || !/^[a-z0-9_-]+\/[a-z0-9._-]+$/i.test(p)) { return null; }
  return p;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', corsHeaders, 405);
  }

  try {
    // Auth + admin gate (mirrors admin-video-upload)
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) { return auth.errorResponse; }
    const { user } = auth;

    const adminClient = createAdminClient();
    if (!(await verifyAdmin(user.id, adminClient))) {
      return errorResponse('Admin access required', corsHeaders, 403);
    }

    // Bunny Storage config
    const zone = Deno.env.get('BUNNY_STORAGE_ZONE_NAME');
    const apiKey = Deno.env.get('BUNNY_STORAGE_API_KEY');
    const cdnHost = Deno.env.get('BUNNY_STORAGE_CDN_HOSTNAME');
    const storageHost = Deno.env.get('BUNNY_STORAGE_HOST') || 'storage.bunnycdn.com';
    if (!zone || !apiKey || !cdnHost) {
      return errorResponse('Image service not configured', corsHeaders, 500);
    }

    const contentType = req.headers.get('content-type') || '';

    // ---- DELETE (best-effort, used on replace/remove) ----
    if (contentType.includes('application/json')) {
      const { action, path } = await req.json();
      if (action !== 'delete' || !path) {
        return errorResponse('Invalid request', corsHeaders, 400);
      }
      const safe = sanitizePath(path);
      if (!safe) { return errorResponse('Invalid path', corsHeaders, 400); }
      const del = await fetch(`https://${storageHost}/${zone}/${safe}`, {
        method: 'DELETE',
        headers: { AccessKey: apiKey },
      });
      // 404 also counts as "gone" — never fail the caller's save path on delete.
      return jsonResponse({ success: true, deleted: del.ok || del.status === 404 }, corsHeaders);
    }

    // ---- UPLOAD ----
    const form = await req.formData();
    const file = form.get('file');
    const folderRaw = String(form.get('folder') || 'misc');

    if (!(file instanceof File)) {
      return errorResponse('No file provided', corsHeaders, 400);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse('Invalid image type. Use JPEG, PNG, WebP, or AVIF.', corsHeaders, 415);
    }
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('Image exceeds the 5MB limit.', corsHeaders, 413);
    }

    const folder = folderRaw.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'misc';
    const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'jpg')
      .toLowerCase().replace(/[^a-z0-9]/g, '');
    // UUID filename — never trust the original name (collisions / traversal).
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const put = await fetch(`https://${storageHost}/${zone}/${path}`, {
      method: 'PUT',
      headers: { AccessKey: apiKey, 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });

    if (!put.ok) {
      const text = await put.text();
      console.error('[admin-image-upload] Bunny PUT failed:', put.status, text);
      return errorResponse('Upload failed', corsHeaders, 502);
    }

    return jsonResponse({ success: true, url: `https://${cdnHost}/${path}`, path }, corsHeaders);
  } catch (error) {
    console.error('[admin-image-upload] Error:', error);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
