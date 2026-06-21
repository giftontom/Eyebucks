import { test, expect } from '@playwright/test';

test.describe('Course Details page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to storefront and click first course
    await page.goto('http://localhost:3000/#/');
    await page.waitForLoadState('networkidle');
  });

  test('navigates to a course detail page from storefront', async ({ page }) => {
    const courseLink = page.locator('a[href*="/course/"]').first();
    await courseLink.click();
    await page.waitForLoadState('networkidle');

    // URL should contain /course/
    await expect(page).toHaveURL(/#\/course\//);
  });

  test('shows course title and description', async ({ page }) => {
    const courseLink = page.locator('a[href*="/course/"]').first();
    await courseLink.click();
    await page.waitForLoadState('networkidle');

    // Should have at least one heading (course title)
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('shows module/chapter list', async ({ page }) => {
    const courseLink = page.locator('a[href*="/course/"]').first();
    await courseLink.click();
    await page.waitForLoadState('networkidle');

    // Look for module list items or curriculum section
    const modules = page.locator('[data-testid="module-item"], li:has-text("Module"), li:has-text("Chapter"), li:has-text("Lesson")');
    const moduleCount = await modules.count();
    // Course should have at least one module listed
    expect(moduleCount).toBeGreaterThan(0);
  });

  test('shows pricing or enroll button', async ({ page }) => {
    const courseLink = page.locator('a[href*="/course/"]').first();
    await courseLink.click();
    await page.waitForLoadState('networkidle');

    // Should show a price or an enroll/buy CTA
    const priceOrCTA = page.locator('text=/₹|enroll|buy|get access|free/i').first();
    await expect(priceOrCTA).toBeVisible({ timeout: 5000 });
  });
});
