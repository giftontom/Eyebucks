/**
 * Create a JSON success response.
 */
export function jsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Create a JSON error response.
 */
export function errorResponse(
  error: string,
  corsHeaders: Record<string, string>,
  status: number = 400
): Response {
  return new Response(
    JSON.stringify({ success: false, error }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
