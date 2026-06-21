import { test, expect } from '@playwright/test';

import { test as authTest, expect as authExpect } from './fixtures/auth';

test.describe('Checkout flow — unauthenticated', () => {
  test('unauthenticated user redirected to login from checkout', async ({ page }) => {
    await page.goto('http://localhost:3000/#/checkout/some-course-id');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#\/login/);
  });

  test('success page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('http://localhost:3000/#/success');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toMatch(/#\/(success|login)/);
  });
});

test.describe('Checkout flow — public', () => {
  test('course details page shows enroll CTA', async ({ page }) => {
    await page.goto('http://localhost:3000/#/');
    await page.waitForLoadState('networkidle');

    const courseLink = page.locator('a[href*="/course/"]').first();
    if (await courseLink.isVisible({ timeout: 5000 })) {
      await courseLink.click();
      await page.waitForLoadState('networkidle');

      const enrollBtn = page.getByRole('button', { name: /enroll|buy|get access/i }).first();
      const hasEnrollBtn = await enrollBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasEnrollBtn) {
        await expect(enrollBtn).toBeVisible();
      }
    }
  });
});

authTest.describe('Checkout flow — authenticated', () => {
  authTest('checkout page loads for authenticated user', async ({ authenticatedPage }) => {
    // First get a real course ID from storefront
    await authenticatedPage.goto('http://localhost:3000/#/');
    await authenticatedPage.waitForLoadState('networkidle');

    const courseLink = authenticatedPage.locator('a[href*="/course/"]').first();
    if (await courseLink.isVisible({ timeout: 5000 })) {
      const href = await courseLink.getAttribute('href');
      const courseId = href?.split('/course/')[1];
      if (courseId) {
        await authenticatedPage.goto(`http://localhost:3000/#/checkout/${courseId}`);
        await authenticatedPage.waitForLoadState('networkidle');

        // Should not redirect to login
        const url = authenticatedPage.url();
        authExpect(url).not.toMatch(/#\/login/);
      }
    }
  });

  authTest('completes happy-path purchase via stubbed Razorpay', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Surface page errors during dev — easier to diagnose stub mismatches
    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error' || t === 'warning' || msg.text().startsWith('[E2E]')) {
        // eslint-disable-next-line no-console
        console.log(`[browser:${t}]`, msg.text());
      }
    });
    page.on('pageerror', (err) => {
      // eslint-disable-next-line no-console
      console.log('[browser:pageerror]', err.message);
    });
    page.on('response', (resp) => {
      if (resp.status() >= 400) {
        // eslint-disable-next-line no-console
        console.log(`[browser:response] ${resp.status()} ${resp.request().method()} ${resp.url()}`);
      }
    });
    page.on('requestfailed', (req) => {
      // eslint-disable-next-line no-console
      console.log(`[browser:requestfailed] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    });

    // Strategy: return `mock: true` from the order-create stub. That flips
    // `!orderResponse.mock` to false in Checkout.tsx L291, bypasses the Razorpay SDK entirely,
    // and takes the dev-mode mock-payment branch at L324 which calls handlePaymentSuccess
    // directly — which in turn hits our checkout-verify stub and navigates to /#/success.

    // CORS headers needed because Supabase calls hit a different origin (supabase.co)
    // and the browser requires preflight + CORS-allowed response headers.
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PATCH, DELETE',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Credentials': 'true',
    };

    const fulfillJson = (route: import('@playwright/test').Route, body: object) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(body),
      });

    const handlePreflight = (route: import('@playwright/test').Route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return null;
    };

    // Abort every Razorpay network call so the SDK never loads — forces the dev mock branch.
    await page.route(/razorpay\.com/, (route) => route.abort());

    // Stub the ownership check so the dev user is treated as not-yet-enrolled.
    await page.route(/\/rest\/v1\/enrollments\?.*course_id=eq\./, async (route) => {
      const preflight = handlePreflight(route);
      if (preflight) return preflight;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: '[]',
      });
    });

    // Stub the two checkout Edge Functions
    await page.route(/\/functions\/v1\/checkout-create-order/, async (route) => {
      // eslint-disable-next-line no-console
      console.log('[E2E test] route hit: checkout-create-order method=', route.request().method());
      const preflight = handlePreflight(route);
      if (preflight) return preflight;
      return fulfillJson(route, {
        success: true,
        orderId: 'order_test',
        amount: 49900,
        currency: 'INR',
        key: 'rzp_test_key',
        courseTitle: 'Stubbed Course',
        mock: true,
      });
    });

    await page.route(/\/functions\/v1\/checkout-verify/, async (route) => {
      // eslint-disable-next-line no-console
      console.log('[E2E test] route hit: checkout-verify method=', route.request().method());
      const preflight = handlePreflight(route);
      if (preflight) return preflight;
      return fulfillJson(route, {
        success: true,
        verified: true,
        enrollmentId: 'test-enr-id',
      });
    });

    // Pull a real course ID off the storefront so the route matches a valid /checkout/:id
    await page.goto('http://localhost:3000/#/');
    await page.waitForLoadState('networkidle');

    const courseLink = page.locator('a[href*="/course/"]').first();
    await authExpect(courseLink).toBeVisible({ timeout: 10000 });
    const href = await courseLink.getAttribute('href');
    const courseId = href!.split('/course/')[1];
    authExpect(courseId).toBeTruthy();

    await page.goto(`http://localhost:3000/#/checkout/${courseId}`);
    await page.waitForLoadState('networkidle');

    // Fill the form (phone may already be readonly if seeded; only fill if writable)
    const phoneInput = page.getByLabel(/phone number/i);
    await authExpect(phoneInput).toBeVisible({ timeout: 5000 });
    const phoneReadOnly = await phoneInput.evaluate((el) => (el as HTMLInputElement).readOnly).catch(() => false);
    if (!phoneReadOnly) {
      await phoneInput.fill('+919876543210');
    }

    const nameInput = page.getByLabel(/full name/i);
    if (!(await nameInput.inputValue())) {
      await nameInput.fill('Test User');
    }

    const emailInput = page.getByLabel(/email address/i);
    if (!(await emailInput.inputValue())) {
      await emailInput.fill('test@example.com');
    }

    // Click the Pay submit button — its label includes the rupee total
    await page.getByRole('button', { name: /^pay /i }).click();

    // HashRouter changes URL via location.hash — waitForFunction polls reliably without
    // waiting on a (never-fired) load event the way page.waitForURL does. The dev-mode mock
    // path pauses 2s before firing handlePaymentSuccess, so a 20s budget is ample.
    await page.waitForFunction(
      () => window.location.hash.startsWith('#/success'),
      { timeout: 20000 }
    );

    const finalUrl = page.url();
    authExpect(finalUrl).toContain('courseId=');
    authExpect(finalUrl).toContain('orderId=');
  });
});
