/**
 * Analytics utility — thin wrapper around PostHog.
 * All calls are no-ops when PostHog is not configured.
 */

type Properties = Record<string, unknown>;

function getPostHog() {
  // posthog-js attaches itself to window.posthog after init
  return (window as unknown as { posthog?: { capture: (event: string, props?: Properties) => void; identify: (id: string, traits?: Properties) => void; reset: () => void } }).posthog;
}

export const analytics = {
  /**
   * Track a custom event.
   * @param event  snake_case event name, e.g. "course_viewed"
   * @param props  optional properties
   */
  track(event: string, props?: Properties): void {
    try {
      getPostHog()?.capture(event, props);
    } catch {
      // Never throw — analytics must never crash the app
    }
  },

  /**
   * Identify the current user. Call after successful login.
   */
  identify(userId: string, traits?: Properties): void {
    try {
      getPostHog()?.identify(userId, traits);
    } catch {
      // no-op
    }
  },

  /**
   * Reset identity. Call on logout.
   */
  reset(): void {
    try {
      getPostHog()?.reset();
    } catch {
      // no-op
    }
  },
};
