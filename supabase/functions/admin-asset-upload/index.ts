// Eyebuckz LMS: Admin Asset Upload — Cloudflare R2 presigned PUT URL generator.
// Admin-gated. Returns a presigned S3 PUT URL so the admin browser uploads the file
// DIRECTLY to R2 (any size, single-PUT up to 5GB) — no storage key on the client,
// no Edge Function request-body limit. See ADR-008.
//
// POST { filename }              -> { success, path, uploadUrl, fileExt }
// POST { action:'delete', path } -> { success, deleted }
//
// Client: PUT the file bytes to `uploadUrl` (no extra signed headers), then save
// `path` as digital_assets.storage_path via digitalAssetsApi.createAsset.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getR2, presign } from '../_shared/r2.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const UPLOAD_EXPIRES = 600; // 10 min to complete the upload

// Permissive allowlist for creator deliverables; executables/scripts are excluded.
const ALLOWED_EXT = new Set([
  'zip', 'rar', '7z', 'tar', 'gz',
  'cube', '3dl', 'look', 'xmp', 'lut', 'icc',
  'pdf', 'epub',
  'wav', 'mp3', 'aiff', 'aif', 'flac', 'ogg', 'm4a',
  'mp4', 'mov', 'mxf', 'prores',
  'prproj', 'aep', 'drp', 'fcpxml', 'xml', 'mogrt',
  'psd', 'ai', 'tif', 'tiff', 'png', 'jpg', 'jpeg', 'webp', 'svg',
  'json', 'txt', 'rtf', 'docx', 'pptx', 'csv',
]);

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
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) { return auth.errorResponse; }
    const { user } = auth;

    const admin = createAdminClient();
    if (!(await verifyAdmin(user.id, admin))) {
      return errorResponse('Admin access required', corsHeaders, 403);
    }

    const r2 = getR2();
    if (!r2) {
      console.error('[admin-asset-upload] R2 not configured');
      return errorResponse('Asset storage not configured', corsHeaders, 500);
    }

    const body = await req.json();

    // ---- DELETE (on replace / asset removal) ----
    if (body?.action === 'delete') {
      const safe = sanitizePath(String(body.path || ''));
      if (!safe) { return errorResponse('Invalid path', corsHeaders, 400); }
      const del = await r2.client.fetch(`${r2.base}/${safe}`, { method: 'DELETE' });
      if (!del.ok && del.status !== 404) {
        console.error('[admin-asset-upload] R2 delete failed:', del.status);
      }
      return jsonResponse({ success: true, deleted: del.ok || del.status === 404 }, corsHeaders);
    }

    // ---- PRESIGNED UPLOAD URL ----
    const filename = String(body?.filename || '');
    const ext = (filename.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ext || !ALLOWED_EXT.has(ext)) {
      return errorResponse('Unsupported file type', corsHeaders, 415);
    }
    // UUID path — never trust the original name (collisions / traversal).
    const path = `assets/${crypto.randomUUID()}.${ext}`;
    const uploadUrl = await presign(r2, path, 'PUT', UPLOAD_EXPIRES);

    return jsonResponse({ success: true, path, uploadUrl, fileExt: ext }, corsHeaders);
  } catch (error) {
    console.error('[admin-asset-upload] Error:', error);
    return errorResponse('Internal server error', getCorsHeaders(req), 500);
  }
});
