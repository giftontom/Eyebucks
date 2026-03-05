/**
 * Translate common Supabase/Postgres errors into user-friendly messages
 */

const ERROR_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /duplicate key.*courses_slug_key/i, message: 'A course with this slug already exists. Please choose a different slug.' },
  { pattern: /duplicate key.*unique/i, message: 'A record with this value already exists.' },
  { pattern: /violates foreign key/i, message: 'This record references data that no longer exists. Please refresh and try again.' },
  { pattern: /violates check constraint/i, message: 'One of the values is outside the allowed range. Please check your inputs.' },
  { pattern: /violates not-null/i, message: 'A required field is missing. Please fill in all required fields.' },
  { pattern: /permission denied/i, message: 'You do not have permission to perform this action.' },
  { pattern: /row-level security/i, message: 'Access denied. You may not have the required permissions.' },
];

export function translateAdminError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  for (const { pattern, message: friendly } of ERROR_MAP) {
    if (pattern.test(message)) {
      return friendly;
    }
  }

  return message || 'An unexpected error occurred. Please try again.';
}
