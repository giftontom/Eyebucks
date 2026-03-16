import { test, expect } from '@playwright/test';

test.describe('Enrollment flow', () => {
  test('dashboard requires authentication', async ({ page }) => {
    await page.goto('http://localhost:3000/#/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#\/login/);
  });

  test('profile page requires authentication', async ({ page }) => {
    await page.goto('http://localhost:3000/#/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#\/login/);
  });

  test('learn page requires authentication', async ({ page }) => {
    await page.goto('http://localhost:3000/#/learn/some-course-id');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#\/login/);
  });
});
