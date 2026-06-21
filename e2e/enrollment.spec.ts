import { test, expect } from '@playwright/test';

import { test as authTest, expect as authExpect } from './fixtures/auth';

test.describe('Enrollment flow — unauthenticated', () => {
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

authTest.describe('Enrollment flow — authenticated', () => {
  authTest('dashboard loads after dev login', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('http://localhost:3000/#/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');

    // Should stay on dashboard, not redirect to login
    await authExpect(authenticatedPage).toHaveURL(/#\/dashboard/);
  });

  authTest('profile page loads after dev login', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('http://localhost:3000/#/profile');
    await authenticatedPage.waitForLoadState('networkidle');

    await authExpect(authenticatedPage).toHaveURL(/#\/profile/);
  });

  authTest('dashboard shows enrolled courses or empty state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('http://localhost:3000/#/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');

    // Should show either course cards or an empty state CTA
    const hasCourses = await authenticatedPage.locator('[data-testid="course-card"], a[href*="/learn/"]').count();
    const hasEmptyState = await authenticatedPage.locator('text=/no courses|browse|get started|explore/i').count();
    authExpect(hasCourses + hasEmptyState).toBeGreaterThan(0);
  });
});
