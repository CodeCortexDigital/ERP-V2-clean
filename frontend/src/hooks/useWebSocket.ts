import { useState, useEffect, useCallback } from 'react';
import { websocketService, type MessageHandler } from '../services/websocket.service';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  token?: string;
  endpoint?: string; // 'notifications' | 'dashboard'
  onMessage?: (type: string, data: any) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
  send: (type: string, data: any) => void;
  subscribe: (type: string, handler: MessageHandler) => () => void;
}

/**
 * Custom hook for WebSocket connection management.
 * Supports multiple named endpoints via the `endpoint` option.
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    token,
    endpoint = 'notifications',
    onMessage,
    onConnectionChange,
  } = options;

  const [isConnected, setIsConnected] = useState(
    () => websocketService.isConnected(endpoint)
  );

  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      setIsConnected(connected);
      onConnectionChange?.(connected);
    },
    [onConnectionChange]
  );

  const handleMessage = useCallback(
    (message: { type: string; data: any }) => {
      onMessage?.(message.type, message.data);
    },
    [onMessage]
  );

  const connect = useCallback(
    (authToken?: string) => {
      websocketService.connect(authToken ?? token, endpoint);
    },
    [token, endpoint]
  );

  const disconnect = useCallback(() => {
    websocketService.disconnect(endpoint);
  }, [endpoint]);

  const send = useCallback(
    (type: string, data: any) => {
      websocketService.send(type, data, endpoint);
    },
    [endpoint]
  );

  const subscribe = useCallback(
    (type: string, handler: MessageHandler) => {
      return websocketService.subscribe(type, handler, endpoint);
    },
    [endpoint]
  );

  useEffect(() => {
    const unsubConnection = websocketService.onConnectionChange(handleConnectionChange, endpoint);

    let unsubMessage: (() => void) | undefined;
    if (onMessage) {
      unsubMessage = websocketService.subscribe('*', handleMessage, endpoint);
    }

    if (autoConnect) {
      connect(token);
    }

    return () => {
      unsubConnection();
      unsubMessage?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, endpoint, token]);

  return { isConnected, connect, disconnect, send, subscribe };
}

export default useWebSocket;