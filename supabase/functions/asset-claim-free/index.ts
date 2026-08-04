// Eyebuckz LMS: Asset Claim Free — grant a free (price 0) digital asset, no payment.
// JWT required. Idempotent: re-claiming an owned free asset is a no-op success.
// Lets free "lead-magnet" assets be acquired without the Razorpay flow.
// See ADR-008 (docs/adr/008-digital-assets-feature.md).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

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
    if (!assetId) {
      return errorResponse('assetId is required', corsHeaders, 400);
    }

    const admin = createAdminClient();
    const { data: asset } = await admin
      .from('digital_assets')
      .select('id, price, status, deleted_at')
      .eq('id', assetId)
      .maybeSingle();

    if (!asset || asset.status !== 'PUBLISHED' || asset.deleted_at) {
      return errorResponse('Asset not found', corsHeaders, 404);
    }
    if (asset.price > 0) {
      // Paid assets must go through checkout — never grant for free here.
      return errorResponse('This asset is not free', corsHeaders, 400);
    }

    const { data: purchase, error } = await admin
      .from('asset_purchases')
      .upsert(
        {
          user_id: user.id,
          asset_id: asset.id,
          status: 'ACTIVE',
          amount: 0,
          purchased_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,asset_id', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[asset-claim-free] grant failed:', error);
      return errorResponse('Could not claim asset', corsHeaders, 500);
    }

    return jsonResponse({ success: true, claimed: true, purchaseId: purchase?.id ?? null }, corsHeaders);
  } catch (error) {
    console.error('[asset-claim-free] Error:', error);
    return errorResponse('Internal server error', getCorsHeaders(req), 500);
  }
});
