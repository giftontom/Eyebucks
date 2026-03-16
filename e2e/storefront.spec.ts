import { test, expect } from '@playwright/test';

test.describe('Storefront', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/#/');
    await page.waitForLoadState('networkidle');
  });

  test('renders homepage with navigation', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('img[alt="Eyebuckz"]').first()).toBeVisible();
  });

  test('shows course cards or loading skeletons', async ({ page }) => {
    // Either course cards or skeletons should be present
    const hasCourses = await page.locator('[data-testid="course-card"]').count();
    const hasSkeletons = await page.locator('.animate-shimmer, .animate-pulse').count();
    expect(hasCourses + hasSkeletons).toBeGreaterThan(0);
  });

  test('search bar is interactive', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('filmmaking');
      await expect(searchInput).toHaveValue('filmmaking');
    }
  });

  test('theme toggle works', async ({ page }) => {
    const html = page.locator('html');
    const isDark = await html.evaluate(el => el.classList.contains('dark'));

    // Find and click theme toggle button
    const toggleBtn = page.locator('button[aria-label*="theme"], button[title*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      const isNowDark = await html.evaluate(el => el.classList.contains('dark'));
      expect(isNowDark).toBe(!isDark);
    }
  });

  test('footer is present', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('footer')).toBeVisible();
  });
});
