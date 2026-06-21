import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../services/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn(), refreshSession: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
    channel: vi.fn(),
  },
}));

import * as api from '../../../../services/api';

describe('services/api barrel', () => {
  const expected = [
    'coursesApi',
    'enrollmentsApi',
    'progressApi',
    'checkoutApi',
    'adminApi',
    'notificationsApi',
    'siteContentApi',
    'paymentsApi',
    'certificatesApi',
    'reviewsApi',
    'usersApi',
    'couponsApi',
    'wishlistApi',
  ];

  it.each(expected)('exports %s as a non-empty object', (name) => {
    const mod = (api as Record<string, unknown>)[name];
    expect(mod, `${name} is missing from the barrel`).toBeDefined();
    expect(typeof mod).toBe('object');
    expect(Object.keys(mod as object).length).toBeGreaterThan(0);
  });

  it('exports the progress threshold constants', () => {
    expect(api.AUTO_SAVE_INTERVAL).toBe(30000);
    expect(api.COMPLETION_THRESHOLD).toBe(0.95);
  });

  it('exports the named helpers', () => {
    expect(typeof api.mapNotification).toBe('function');
    expect(typeof api.mapUserProfile).toBe('function');
  });
});
