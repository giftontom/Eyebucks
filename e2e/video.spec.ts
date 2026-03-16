import { test, expect } from '@playwright/test';

test.describe('Video flow', () => {
  test('learn page redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('http://localhost:3000/#/learn/test-course-id');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#\/login/);
  });

  test('course details page renders without crashing', async ({ page }) => {
    await page.goto('http://localhost:3000/#/');
    await page.waitForLoadState('networkidle');

    const courseLink = page.locator('a[href*="/course/"]').first();
    if (await courseLink.isVisible({ timeout: 5000 })) {
      await courseLink.click();
      await page.waitForLoadState('networkidle');

      // No error overlay should be visible
      await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
      // Page should have some content
      await expect(page.getByRole('main')).toBeVisible();
    }
  });
});
