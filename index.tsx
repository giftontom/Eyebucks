import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { logger } from './utils/logger';
import { supabase } from './services/supabase';

// Import data export utility (makes tools available in console)
import './utils/dataExport';

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
  if (hash && (hash.includes('access_token=') || hash.includes('error_description='))) {
    // getSession() awaits Supabase's internal _initialize(), which reads
    // window.location.hash (still intact — React hasn't rendered yet).
    await supabase.auth.getSession();
    // Replace the token hash with a clean route for HashRouter
    window.history.replaceState(null, '', window.location.pathname + '#/');
  }
}

handleOAuthCallbackIfNeeded().then(() => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});