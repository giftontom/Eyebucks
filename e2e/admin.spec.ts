import { test, expect } from '@playwright/test';

import { test as authTest, expect as authExpect } from './fixtures/auth';

test.describe('Admin flow — unauthenticated', () => {
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

authTest.describe('Admin flow — authenticated as admin', () => {
  authTest('admin dashboard loads for admin user', async ({ adminPage }) => {
    await adminPage.goto('http://localhost:3000/#/admin');
    await adminPage.waitForLoadState('networkidle');

    // Should stay on admin page, not redirect
    await authExpect(adminPage).toHaveURL(/#\/admin/);
  });

  authTest('admin courses page loads', async ({ adminPage }) => {
    await adminPage.goto('http://localhost:3000/#/admin/courses');
    await adminPage.waitForLoadState('networkidle');

    await authExpect(adminPage).toHaveURL(/#\/admin\/courses/);
  });

  authTest('admin users page loads', async ({ adminPage }) => {
    await adminPage.goto('http://localhost:3000/#/admin/users');
    await adminPage.waitForLoadState('networkidle');

    await authExpect(adminPage).toHaveURL(/#\/admin\/users/);
  });
});
