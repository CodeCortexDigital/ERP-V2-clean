/**
 * Sentry configuration for frontend error tracking.
 * This file is imported in main.tsx
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initSentry = () => {
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  if (!sentryDSN) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: sentryDSN,
    integrations: [
      new BrowserTracing({
        // Set sampling rate for performance monitoring
        tracingOrigins: ['localhost', /^\//],
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          window.history
        ),
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    environment,
    release: import.meta.env.VITE_APP_VERSION || 'unknown',

    // Capture Replay for 10% of all sessions,
    // plus, capture 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Don't send PII data
    sendDefaultPii: false,

    // Allowed URLs for error tracking
    allowUrls: [
      /https?:\/\/(localhost|127\.0\.0\.1)/,
      /https?:\/\/yourdomain\.com/,
    ],
  });
};

export const setSentryUser = (user: any) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    username: user.username,
    email: user.email,
    ip_address: '{{auto}}',
  });
};

export const captureSentryException = (
  error: Error,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'error'
) => {
  Sentry.captureException(error, { level });
};

export const captureSentryMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'info'
) => {
  Sentry.captureMessage(message, level);
};

export const addBreadcrumb = (
  message: string,
  category: string = 'user-action',
  level: 'fatal' | 'error' | 'warning' | 'info' = 'info',
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
};

export const withSentryErrorBoundary = (Component: React.ComponentType<any>) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <h1>Oops! Something went wrong</h1>
        <p>Our team has been notified. Please try refreshing the page.</p>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    ),
  });
};
