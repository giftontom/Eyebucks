import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('renders login page with Google OAuth button', async ({ page }) => {
    await page.goto('http://localhost:3000/#/login');
    await page.waitForLoadState('networkidle');

    // Google sign-in button visible
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();

    // Branding visible
    await expect(page.locator('img[alt="Eyebuckz"]').first()).toBeVisible();
  });

  test('shows error message on OAuth failure', async ({ page }) => {
    await page.goto('http://localhost:3000/#/login');
    await page.evaluate(() => {
      sessionStorage.setItem('oauth_error', 'OAuth failed: access_denied');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('alert')).toContainText('OAuth failed');
  });

  test('shows dev login buttons when VITE_DEV_LOGIN is true', async ({ page }) => {
    await page.goto('http://localhost:3000/#/login');
    await page.waitForLoadState('networkidle');

    // Dev login buttons should be present (VITE_DEV_LOGIN=true in .env.local)
    await expect(page.getByRole('button', { name: /login as user/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /login as admin/i })).toBeVisible();
  });

  test('has working back to homepage link', async ({ page }) => {
    await page.goto('http://localhost:3000/#/login');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /back to homepage/i }).click();
    await expect(page).toHaveURL(/\/#\//);
  });

  test('links to terms and privacy policy', async ({ page }) => {
    await page.goto('http://localhost:3000/#/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /terms of service/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /privacy policy/i }).first()).toBeVisible();
  });
});
