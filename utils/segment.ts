/**
 * Persistence for the audience-segment selection made on the entry gate.
 *
 * Stored in localStorage (client) + a 90-day cookie (so the choice can later be
 * read server-side or by a tag manager if we wire that up). All access is wrapped
 * so storage being unavailable (private mode, blocked cookies) never throws.
 */

export const SEGMENT_STORAGE_KEY = 'eyebuckz_segment';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

/** Returns the persisted segment key, or null if the visitor hasn't chosen yet. */
export function getStoredSegment(): string | null {
  try {
    const fromLs = localStorage.getItem(SEGMENT_STORAGE_KEY);
    if (fromLs) return fromLs;
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + SEGMENT_STORAGE_KEY + '=([^;]*)'),
    );
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Persists the chosen segment key to localStorage + a 90-day cookie. */
export function storeSegment(key: string): void {
  try {
    localStorage.setItem(SEGMENT_STORAGE_KEY, key);
    document.cookie =
      `${SEGMENT_STORAGE_KEY}=${encodeURIComponent(key)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax; Secure`;
  } catch {
    /* ignore — storage may be blocked */
  }
}
