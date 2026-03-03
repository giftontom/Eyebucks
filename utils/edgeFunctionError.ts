/**
 * Shared utilities for extracting errors from Supabase Edge Function responses.
 *
 * The Supabase SDK throws FunctionsHttpError with:
 *   - error.message = "Edge Function returned a non-2xx status code" (hardcoded)
 *   - error.context = raw Response object (body unconsumed)
 *
 * When the Supabase gateway rejects an expired JWT (before the Edge Function runs),
 * it returns { "msg": "Invalid JWT" } with status 401.
 */

/**
 * Detect auth/JWT errors using HTTP status code (reliable) with message fallback.
 * Checks Response.status === 401 first, then falls back to message pattern matching.
 */
export function isEdgeFnAuthError(fnError: unknown): boolean {
  const err = fnError as { context?: unknown; message?: string } | null;
  const ctx = err?.context;
  if (ctx instanceof Response && ctx.status === 401) return true;

  const msg = (err?.message || '').toLowerCase();
  return ['invalid jwt', 'jwt expired', 'unauthorized', 'token is expired'].some(
    (p) => msg.includes(p)
  );
}

/**
 * Extract the real error message from an Edge Function error.
 * Handles: Response objects (clone → JSON/text), plain objects, strings.
 */
export async function extractEdgeFnError(
  fnError: unknown,
  fallback: string
): Promise<string> {
  try {
    const err = fnError as { context?: unknown; message?: string } | null;
    const ctx = err?.context;
    if (ctx instanceof Response) {
      const clone = ctx.clone();
      try {
        const body = await clone.json();
        return body?.error || body?.message || body?.msg || fallback;
      } catch {
        const text = await ctx.clone().text();
        return text || fallback;
      }
    }
    // Fallback: context is already a parsed object
    if (ctx && typeof ctx === 'object') {
      const obj = ctx as Record<string, string>;
      return obj.error || obj.message || obj.msg || fallback;
    }
  } catch {
    /* ignore */
  }
  const err = fnError as { message?: string } | null;
  return err?.message || fallback;
}
