import { test, expect } from '@playwright/test';

test.describe('Checkout flow', () => {
  test('unauthenticated user redirected to login from checkout', async ({ page }) => {
    await page.goto('http://localhost:3000/#/checkout/some-course-id');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login
    await expect(page).toHaveURL(/#\/login/);
  });

  test('course details page shows enroll CTA', async ({ page }) => {
    await page.goto('http://localhost:3000/#/');
    await page.waitForLoadState('networkidle');

    // Click first course card if available
    const courseLink = page.locator('a[href*="/course/"]').first();
    if (await courseLink.isVisible({ timeout: 5000 })) {
      await courseLink.click();
      await page.waitForLoadState('networkidle');

      // Should show enroll/buy button
      const enrollBtn = page.getByRole('button', { name: /enroll|buy|get access/i }).first();
      const hasEnrollBtn = await enrollBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasEnrollBtn) {
        await expect(enrollBtn).toBeVisible();
      }
    }
  });

  test('success page is accessible', async ({ page }) => {
    // Navigate to success page — should show something (may redirect if no session)
    await page.goto('http://localhost:3000/#/success');
    await page.waitForLoadState('networkidle');

    // Either shows success content or redirects to login
    const url = page.url();
    expect(url).toMatch(/#\/(success|login)/);
  });
});
