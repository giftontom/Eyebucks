import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { supabase } from './services/supabase';
import { logger } from './utils/logger';
import './index.css';

// Initialize Sentry if configured
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  logger.info('[Sentry] Error monitoring initialized');
} else {
  logger.info('[Sentry] Not configured - skipping error monitoring');
}

// Initialize PostHog asynchronously to avoid blocking initial render
if (import.meta.env.VITE_POSTHOG_KEY) {
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      loaded: (ph) => {
        if (import.meta.env.MODE !== 'production') {
          ph.opt_out_capturing();
        }
      },
    });
    logger.info('[PostHog] Analytics initialized');
  });
} else {
  logger.info('[PostHog] Not configured - skipping analytics');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Handle Supabase OAuth callback BEFORE React/HashRouter renders.
 *
 * Supabase implicit flow redirects back with tokens in the hash fragment:
 *   https://dev.eyebuckz.com#access_token=xxx&refresh_token=xxx&...
 *
 * HashRouter also uses the hash for routing (#/login, #/dashboard, etc.).
 * Without this guard, HashRouter sees the token hash, matches no route,
 * the catch-all redirects to #/ — wiping the tokens before Supabase can
 * parse them.
 *
 * Fix: detect the OAuth hash, let Supabase consume it, then replace with
 * a clean #/ so HashRouter starts on the home route.
 */
async function handleOAuthCallbackIfNeeded(): Promise<void> {
  const hash = window.location.hash;
  if (hash && hash.includes('error_description=')) {
    // OAuth error — extract message and redirect to login with error
    const params = new URLSearchParams(hash.substring(1));
    const errorDesc = params.get('error_description') || 'Authentication failed';
    logger.error('[OAuth] Error:', errorDesc);
    window.history.replaceState(null, '', window.location.pathname + '#/login');
    // Store error for the login page to display
    sessionStorage.setItem('oauth_error', errorDesc);
    return;
  }
  if (hash && hash.includes('access_token=')) {
    // getSession() awaits Supabase's internal _initialize(), which reads
    // window.location.hash (still intact — React hasn't rendered yet).
    await supabase.auth.getSession();
    // Replace the token hash with a clean route for HashRouter
    window.history.replaceState(null, '', window.location.pathname + '#/');
  }
}

handleOAuthCallbackIfNeeded()
  .catch(err => logger.error('[OAuth] Callback error:', err))
  .then(() => {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });