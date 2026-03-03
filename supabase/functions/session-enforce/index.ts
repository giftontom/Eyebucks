import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify caller's JWT
    const authResult = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in authResult) {
      return authResult.errorResponse;
    }

    // Extract raw JWT from Authorization header (signOut expects the token, not user ID)
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const adminClient = createAdminClient();

    // Sign out all OTHER sessions for this user (keeps current session alive)
    const { error } = await adminClient.auth.admin.signOut(jwt, 'others');

    if (error) {
      console.error('[session-enforce] Failed to invalidate sessions:', error);
      return errorResponse('Failed to enforce session limit', corsHeaders, 500);
    }

    return jsonResponse({ success: true }, corsHeaders);
  } catch (err) {
    console.error('[session-enforce] Unexpected error:', err);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
