import { test as base, expect } from '@playwright/test';

/**
 * Auth fixture that logs in via the dev login button (requires VITE_DEV_LOGIN=true).
 * Provides `authenticatedPage` (user role) and `adminPage` (admin role).
 */
export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base['extend']> extends never ? never : Awaited<ReturnType<typeof loginAs>>;
  adminPage: Awaited<ReturnType<typeof loginAs>>;
}>({
  authenticatedPage: async ({ page }, use) => {
    await loginAs(page, 'user');
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await loginAs(page, 'admin');
    await use(page);
  },
});

async function loginAs(page: any, role: 'user' | 'admin') {
  await page.goto('http://localhost:3000/#/login');
  await page.waitForLoadState('networkidle');

  const buttonName = role === 'admin' ? /login as admin/i : /login as user/i;
  const loginBtn = page.getByRole('button', { name: buttonName });

  // Dev login buttons must be visible (VITE_DEV_LOGIN=true)
  await expect(loginBtn).toBeVisible({ timeout: 5000 });
  await loginBtn.click();

  // Wait for redirect away from login page
  await page.waitForURL(/(?!.*\/login)/, { timeout: 10000 });
  return page;
}

export { expect };
