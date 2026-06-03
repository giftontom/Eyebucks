/**
 * Shared Supabase query utilities
 */

/**
 * Escape special characters that could alter PostgREST `.or()` filter logic.
 * Characters `(`, `)`, `,`, `"`, `'`, `\` are escaped with a backslash.
 *
 * @example
 * const s = escapeOrFilter(userInput);
 * query.or(`name.ilike.%${s}%,email.ilike.%${s}%`);
 */
export function escapeOrFilter(value: string): string {
  return value.replace(/[(),"'\\]/g, '\\$&');
}
