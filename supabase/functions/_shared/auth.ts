import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { createAdminClient } from './supabaseAdmin.ts';

type AuthSuccess = { user: { id: string; email?: string } };
type AuthFailure = { errorResponse: Response };

/**
 * Verify JWT auth from request Authorization header.
 * Returns { user } on success or { errorResponse } on failure.
 */
export async function verifyAuth(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<AuthSuccess | AuthFailure> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      errorResponse: new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return {
      errorResponse: new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { user };
}

/**
 * Check if a user has the ADMIN role.
 */
export async function verifyAdmin(
  userId: string,
  adminClient?: ReturnType<typeof createAdminClient>
): Promise<boolean> {
  const client = adminClient || createAdminClient();
  const { data: profile } = await client
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role === 'ADMIN';
}
