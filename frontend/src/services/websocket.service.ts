export type MessageHandler = (message: { type: string; data: unknown }) => void;
export type ConnectionHandler = (connected: boolean) => void;

type SubscriberMap = Map<string, Set<MessageHandler>>;

let socket: WebSocket | null = null;
let connectionHandlers = new Set<ConnectionHandler>();
const subscribers: SubscriberMap = new Map();

function getWsUrl(token: string): string | null {
  const base = import.meta.env.VITE_WS_URL as string | undefined;
  if (!base) return null;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}

function notifyConnection(connected: boolean) {
  connectionHandlers.forEach((h) => h(connected));
}

function dispatchMessage(type: string, data: unknown) {
  const handlers = subscribers.get(type);
  handlers?.forEach((h) => h({ type, data }));
  const all = subscribers.get('*');
  all?.forEach((h) => h({ type, data }));
}

export const websocketService = {
  connect: async (token?: string): Promise<void> => {
    const accessToken = token ?? localStorage.getItem('access_token');
    if (!accessToken) return;

    const url = getWsUrl(accessToken);
    if (!url) return;

    if (socket?.readyState === WebSocket.OPEN) return;

    return new Promise((resolve, reject) => {
      try {
        socket = new WebSocket(url);

        socket.onopen = () => {
          notifyConnection(true);
          resolve();
        };

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data as string);
            dispatchMessage(parsed.type ?? 'notification', parsed.data ?? parsed);
          } catch {
            dispatchMessage('notification', event.data);
          }
        };

        socket.onclose = () => {
          notifyConnection(false);
          socket = null;
        };

        socket.onerror = () => {
          notifyConnection(false);
          reject(new Error('WebSocket connection failed'));
        };
      } catch (err) {
        reject(err);
      }
    });
  },

  disconnect: () => {
    socket?.close();
    socket = null;
    notifyConnection(false);
  },

  send: (type: string, data: unknown) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data }));
    }
  },

  subscribe: (type: string, handler: MessageHandler) => {
    if (!subscribers.has(type)) subscribers.set(type, new Set());
    subscribers.get(type)!.add(handler);
    return () => subscribers.get(type)?.delete(handler);
  },

  onConnectionChange: (handler: ConnectionHandler) => {
    connectionHandlers.add(handler);
    return () => connectionHandlers.delete(handler);
  },
}

export default websocketService;
