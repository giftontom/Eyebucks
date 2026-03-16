import { test, expect } from '@playwright/test';

test.describe('Admin flow', () => {
  test('admin routes redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('http://localhost:3000/#/admin');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#\/login/);
  });

  test('admin courses page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('http://localhost:3000/#/admin/courses');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#\/login/);
  });

  test('admin users page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('http://localhost:3000/#/admin/users');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#\/login/);
  });
});
