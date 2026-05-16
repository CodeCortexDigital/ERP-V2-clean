/**
 * Sentry stubs — install @sentry/react and replace with full config when needed.
 */

import type { ComponentType } from 'react';

export const initSentry = () => {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }
  console.warn('Sentry DSN set but @sentry/react is not installed');
};

export const setSentryUser = (_user: unknown) => {};

export const captureSentryException = (error: Error) => {
  console.error(error);
};

export const captureSentryMessage = (message: string) => {
  console.warn(message);
};

export const addBreadcrumb = (_message: string) => {};

export const withSentryErrorBoundary = <P extends object>(Component: ComponentType<P>) =>
  Component;
