import { describe, it, expect } from 'vitest';

import { translateAdminError } from '../../../utils/adminErrors';

describe('translateAdminError', () => {
  it('translates slug uniqueness violation', () => {
    const err = new Error('duplicate key value violates unique constraint "courses_slug_key"');
    expect(translateAdminError(err)).toMatch(/slug already exists/i);
  });

  it('translates generic unique constraint violation', () => {
    expect(translateAdminError(new Error('duplicate key value violates unique constraint "users_email_key"')))
      .toMatch(/already exists/i);
  });

  it('translates FK violations', () => {
    expect(translateAdminError(new Error('insert or update on table violates foreign key constraint')))
      .toMatch(/no longer exists/i);
  });

  it('translates check constraint violations', () => {
    expect(translateAdminError(new Error('new row violates check constraint "price_positive"')))
      .toMatch(/outside the allowed range/i);
  });

  it('translates not-null violations', () => {
    expect(translateAdminError(new Error('null value in column "title" violates not-null constraint')))
      .toMatch(/required field is missing/i);
  });

  it('translates permission denied', () => {
    expect(translateAdminError(new Error('permission denied for table users')))
      .toMatch(/do not have permission/i);
  });

  it('translates row-level security failures', () => {
    expect(translateAdminError(new Error('new row violates row-level security policy')))
      .toMatch(/access denied/i);
  });

  it('returns the raw message when no pattern matches', () => {
    expect(translateAdminError(new Error('Something unexpected happened'))).toBe('Something unexpected happened');
  });

  it('handles non-Error values via String()', () => {
    expect(translateAdminError('plain string error')).toBe('plain string error');
  });

  it('returns a default message for empty input', () => {
    expect(translateAdminError(new Error(''))).toMatch(/unexpected error occurred/i);
  });
});
