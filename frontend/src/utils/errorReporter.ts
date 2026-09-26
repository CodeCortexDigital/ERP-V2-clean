// Sends browser errors to the server's error tracking (P4). Plain fetch (not the api client) so a failing report can
// never trigger another report; each distinct error is sent once per page load, at most 20 per session.
import { API_BASE_URL } from '@/services/api';

const sent = new Set<string>();
let count = 0;
const MAX = 20;

export function reportError(error: unknown, extra: { component?: string; kind?: string } = {}) {
  try {
    const err = error instanceof Error ? error : new Error(String((error as any)?.message ?? error));
    const key = `${err.name}:${err.message}`;
    if (sent.has(key) || count >= MAX) return;
    // Noise we can't act on: network drops, cancelled requests, browser extensions.
    if (/Network Error|Failed to fetch|Load failed|AbortError|canceled|chrome-extension|ResizeObserver loop/i.test(`${err.message} ${err.stack}`)) return;
    sent.add(key);
    count += 1;
    const token = localStorage.getItem('access_token');
    fetch(`${API_BASE_URL.replace(/\/$/, '')}/errors/client/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ message: err.message.slice(0, 500), stack: (err.stack || '').slice(0, 6000), kind: extra.kind || err.name,
        component: extra.component?.slice(0, 300), url: window.location.pathname }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* reporting must never break the page */
  }
}
