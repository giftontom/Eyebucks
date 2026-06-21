/**
 * Generate HMAC-SHA256 signature as hex string.
 */
export async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * Iterates the full `aBuf` length even when `bBuf` is shorter, so mismatched
 * lengths don't leak via early-return timing. Razorpay always sends 64-hex
 * signatures, but this is defence-in-depth for any caller.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  let result = aBuf.length === bBuf.length ? 0 : 1;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i % bBuf.length];
  }
  return result === 0;
}
