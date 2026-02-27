// Shared CORS utility for Edge Functions
// Returns origin-specific headers instead of wildcard '*'

const ALLOWED_ORIGINS = [
  'https://eyebuckz.com',
  'https://www.eyebuckz.com',
  'https://dev.eyebuckz.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  // Allow exact matches + any *.eyebucks-dev.pages.dev subdomain (Cloudflare Pages deployments)
  const isAllowed = ALLOWED_ORIGINS.includes(origin)
    || /^https:\/\/[a-z0-9-]+\.eyebucks(-dev)?\.pages\.dev$/.test(origin);
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
