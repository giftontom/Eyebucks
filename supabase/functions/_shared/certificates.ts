/**
 * Generate a unique certificate number.
 * Format: EYEBUCKZ-{timestamp_base36}-{random_hex}
 */
export function generateCertificateNumber(): string {
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `EYEBUCKZ-${timestamp}-${randomPart}`;
}
