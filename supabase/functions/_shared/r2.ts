// Shared Cloudflare R2 (S3-compatible) client for digital-asset storage.
// Uses aws4fetch for AWS SigV4 — works in the Deno edge runtime (Web Crypto).
// Requires secrets: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.

import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

export interface R2 {
  client: AwsClient;
  /** Base S3 URL incl. bucket: https://{account}.r2.cloudflarestorage.com/{bucket} */
  base: string;
}

/** Build an R2 client from env, or null if not configured. */
export function getR2(): R2 | null {
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const bucket = Deno.env.get('R2_BUCKET');
  if (!accessKeyId || !secretAccessKey || !accountId || !bucket) { return null; }
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
  return { client, base: `https://${accountId}.r2.cloudflarestorage.com/${bucket}` };
}

/** Presign an object URL (query-signed) for the given method, expiring in `expiresIn` seconds.
 *  Extra query params (e.g. response-content-disposition) are folded into the signature. */
export async function presign(
  r2: R2,
  objectPath: string,
  method: 'GET' | 'PUT',
  expiresIn: number,
  extraQuery: Record<string, string> = {},
): Promise<string> {
  const path = objectPath.replace(/^\/+/, '');
  const url = new URL(`${r2.base}/${path}`);
  url.searchParams.set('X-Amz-Expires', String(expiresIn));
  for (const [k, v] of Object.entries(extraQuery)) { url.searchParams.set(k, v); }
  const signed = await r2.client.sign(new Request(url.toString(), { method }), {
    aws: { signQuery: true },
  });
  return signed.url;
}
