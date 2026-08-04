// Eyebuckz LMS: Asset Download URL — entitlement-gated R2 presigned download.
// JWT required. Verifies the caller OWNS the asset (an ACTIVE asset_purchase) or is
// an admin, then returns a short-lived (~5 min) Cloudflare R2 presigned GET URL.
// The URL EXPIRES, so it is not a permanently shareable link, and the R2 bucket has
// no public access. This is the ONLY path by which a client obtains a download link.
// See ADR-008.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getR2, presign } from '../_shared/r2.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const EXPIRES_IN = 300; // 5 minutes

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

    const { assetId } = await req.json();
    if (!assetId || typeof assetId !== 'string') {
      return errorResponse('assetId is required', corsHeaders, 400);
    }

    const admin = createAdminClient();

    // Load the asset with service role — this is the only place storage_path is read.
    const { data: asset, error: assetErr } = await admin
      .from('digital_assets')
      .select('id, slug, storage_path, file_ext, status, deleted_at, download_count')
      .eq('id', assetId)
      .maybeSingle();
    if (assetErr) {
      console.error('[asset-download-url] asset lookup failed:', assetErr);
      return errorResponse('Internal server error', corsHeaders, 500);
    }
    if (!asset || !asset.storage_path) {
      return errorResponse('Asset not found', corsHeaders, 404);
    }

    // Entitlement check: admins bypass; everyone else needs an ACTIVE purchase.
    const isAdmin = await verifyAdmin(user.id, admin);
    let purchase: { id: string; download_count: number } | null = null;
    if (!isAdmin) {
      if (asset.status !== 'PUBLISHED' || asset.deleted_at) {
        return errorResponse('Asset not available', corsHeaders, 404);
      }
      const { data: p } = await admin
        .from('asset_purchases')
        .select('id, download_count')
        .eq('user_id', user.id)
        .eq('asset_id', assetId)
        .eq('status', 'ACTIVE')
        .maybeSingle();
      if (!p) {
        return errorResponse('You do not own this asset', corsHeaders, 403);
      }
      purchase = p;
    }

    const r2 = getR2();
    if (!r2) {
      console.error('[asset-download-url] R2 not configured');
      return errorResponse('Asset delivery not configured', corsHeaders, 500);
    }

    // Friendly download filename: slug + extension, forced via content-disposition.
    const ext = asset.file_ext ? `.${asset.file_ext}` : '';
    const filename = `${asset.slug}${ext}`;
    const downloadUrl = await presign(r2, asset.storage_path, 'GET', EXPIRES_IN, {
      'response-content-disposition': `attachment; filename="${filename}"`,
    });

    // Best-effort download counters — never fail the response on a counter error.
    try {
      await admin
        .from('digital_assets')
        .update({ download_count: (asset.download_count ?? 0) + 1 })
        .eq('id', assetId);
      if (purchase) {
        await admin
          .from('asset_purchases')
          .update({
            download_count: (purchase.download_count ?? 0) + 1,
            last_downloaded_at: new Date().toISOString(),
          })
          .eq('id', purchase.id);
      }
    } catch (counterErr) {
      console.error('[asset-download-url] counter update failed:', counterErr);
    }

    const expiresAt = Math.floor(Date.now() / 1000) + EXPIRES_IN;
    return jsonResponse({ success: true, downloadUrl, expiresAt, filename }, corsHeaders);
  } catch (error) {
    console.error('[asset-download-url] Error:', error);
    return errorResponse('Internal server error', getCorsHeaders(req), 500);
  }
});
