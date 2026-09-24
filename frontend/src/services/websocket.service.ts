/**
 * WebSocket Service — ERP V2
 *
 * Supports MULTIPLE simultaneous socket connections (e.g. /ws/notifications/
 * and /ws/dashboard/) identified by a string key.
 *
 * Auto-reconnect with exponential back-off (up to 5 retries × 2^n seconds).
 *
 * Env vars used:
 *   VITE_WS_NOTIFICATIONS_URL  – e.g. ws://127.0.0.1:8000/ws/notifications/
 *   VITE_WS_DASHBOARD_URL      – e.g. ws://127.0.0.1:8000/ws/dashboard/
 *   VITE_WS_URL                – legacy fallback (used as notifications URL)
 */

export type MessageHandler = (message: { type: string; data: unknown }) => void;
export type ConnectionHandler = (connected: boolean) => void;

interface ManagedSocket {
  ws: WebSocket | null;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  token: string;
  endpoint: string;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 2000;

const sockets: Map<string, ManagedSocket> = new Map();
const connectionHandlers: Map<string, Set<ConnectionHandler>> = new Map();
const subscribers: Map<string, Map<string, Set<MessageHandler>>> = new Map();

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function getEndpointUrl(endpoint: string, token: string): string | null {
  let base: string | undefined;

  if (endpoint === 'dashboard') {
    base =
      (import.meta.env.VITE_WS_DASHBOARD_URL as string | undefined) ||
      buildFallbackUrl('ws/dashboard/');
  } else {
    // 'notifications' or any other key
    base =
      (import.meta.env.VITE_WS_NOTIFICATIONS_URL as string | undefined) ||
      (import.meta.env.VITE_WS_URL as string | undefined) ||
      buildFallbackUrl('ws/notifications/');
  }

  if (!base) return null;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}

/** Build from VITE_API_URL if the specific WS URL is not set.
 *  Falls back to the current browser hostname so the WS follows the page
 *  when the dev server's IP changes (DHCP) instead of a stale hardcoded host. */
function buildFallbackUrl(path: string): string | undefined {
  let rootBase: string;
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || '';
  if (apiUrl) {
    const normalizedApiUrl = apiUrl.replace(/\/+$/, '');
    rootBase = normalizedApiUrl
      .replace(/\/api\/v\d+$/i, '')
      .replace(/\/api$/i, '');
  } else {
    // Derive from the backend host. The app may be served by the Vite dev
    // server (port 5173), but the WebSocket/API backend lives on :8000, so
    // use the page hostname with the backend port (mirrors api.ts fallback).
    const host = window.location.hostname || '127.0.0.1';
    rootBase = `http://${host}:8000`;
  }
  const wsBase = rootBase.replace(/^http/, 'ws');
  return `${wsBase}/${path.replace(/^\/+/, '')}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function notifyConnection(key: string, connected: boolean) {
  connectionHandlers.get(key)?.forEach((h) => h(connected));
}

function dispatchMessage(key: string, type: string, data: unknown) {
  const typeMap = subscribers.get(key);
  if (!typeMap) return;
  typeMap.get(type)?.forEach((h) => h({ type, data }));
  typeMap.get('*')?.forEach((h) => h({ type, data }));
}

function scheduleReconnect(key: string) {
  const managed = sockets.get(key);
  if (!managed) return;
  if (managed.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn(`[WS:${key}] Max reconnect attempts reached.`);
    return;
  }
  const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, managed.reconnectAttempts);
  managed.reconnectAttempts += 1;
  console.info(`[WS:${key}] Reconnecting in ${delay}ms (attempt ${managed.reconnectAttempts})...`);
  managed.reconnectTimer = setTimeout(() => {
    openSocket(key, managed.endpoint, managed.token, true);
  }, delay);
}

function openSocket(key: string, endpoint: string, token: string, isReconnect = false) {
  if (!token) {
    return;
  }
  const url = getEndpointUrl(endpoint, token);
  if (!url) {
    console.warn(`[WS:${key}] No URL configured — skipping connection.`);
    return;
  }

  const managed = sockets.get(key);
  if (managed?.ws && managed.ws.readyState === WebSocket.OPEN) return; // already open

  if (!isReconnect) {
    sockets.set(key, {
      ws: null,
      reconnectAttempts: 0,
      reconnectTimer: null,
      token,
      endpoint,
    });
  }

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.error(`[WS:${key}] Failed to create WebSocket:`, err);
    scheduleReconnect(key);
    return;
  }

  const current = sockets.get(key)!;
  current.ws = ws;

  ws.onopen = () => {
    console.info(`[WS:${key}] Connected.`);
    current.reconnectAttempts = 0; // reset on success
    notifyConnection(key, true);
  };

  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data as string);
      dispatchMessage(key, parsed.type ?? 'message', parsed.data ?? parsed);
    } catch {
      dispatchMessage(key, 'message', event.data);
    }
  };

  ws.onclose = (ev) => {
    console.info(`[WS:${key}] Closed (code=${ev.code}).`);
    notifyConnection(key, false);
    current.ws = null;
    // Do not reconnect for normal closures (1000) or deliberate disconnects
    if (ev.code !== 1000 && ev.code !== 4401) {
      scheduleReconnect(key);
    }
  };

  ws.onerror = () => {
    console.error(`[WS:${key}] Error.`);
    notifyConnection(key, false);
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const websocketService = {
  /**
   * Connect to a named WS endpoint.
   * @param token  JWT access token
   * @param endpoint  'notifications' | 'dashboard' (default: 'notifications')
   */
  connect: (token?: string, endpoint = 'notifications'): void => {
    const accessToken = token ?? localStorage.getItem('access_token') ?? '';
    if (!accessToken) return;
    openSocket(endpoint, endpoint, accessToken);
  },

  /** Disconnect one or all sockets */
  disconnect: (endpoint?: string): void => {
    const keys = endpoint ? [endpoint] : [...sockets.keys()];
    keys.forEach((key) => {
      const managed = sockets.get(key);
      if (managed) {
        if (managed.reconnectTimer) clearTimeout(managed.reconnectTimer);
        managed.ws?.close(1000, 'Client disconnect');
        managed.ws = null;
      }
      notifyConnection(key, false);
    });
  },

  /** Send a JSON message on a named socket */
  send: (type: string, data: unknown, endpoint = 'notifications'): void => {
    const ws = sockets.get(endpoint)?.ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  },

  /** Subscribe to a message type on a named socket */
  subscribe: (type: string, handler: MessageHandler, endpoint = 'notifications'): (() => void) => {
    if (!subscribers.has(endpoint)) subscribers.set(endpoint, new Map());
    const typeMap = subscribers.get(endpoint)!;
    if (!typeMap.has(type)) typeMap.set(type, new Set());
    typeMap.get(type)!.add(handler);
    return () => typeMap.get(type)?.delete(handler);
  },

  /** Listen to connection state changes for a named socket */
  onConnectionChange: (handler: ConnectionHandler, endpoint = 'notifications'): (() => void) => {
    if (!connectionHandlers.has(endpoint)) connectionHandlers.set(endpoint, new Set());
    connectionHandlers.get(endpoint)!.add(handler);
    return () => connectionHandlers.get(endpoint)?.delete(handler);
  },

  /** Return whether a named socket is currently open */
  isConnected: (endpoint = 'notifications'): boolean => {
    return sockets.get(endpoint)?.ws?.readyState === WebSocket.OPEN;
  },
};

export default websocketService;
