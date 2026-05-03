import { useState, useEffect, useCallback } from 'react';
import { websocketService, type MessageHandler } from '../services/websocket.service';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  token?: string;
  onMessage?: (type: string, data: any) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connect: (token?: string) => Promise<void>;
  disconnect: () => void;
  send: (type: string, data: any) => void;
  subscribe: (type: string, handler: MessageHandler) => () => void;
}

/**
 * Custom hook for WebSocket connection management
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, token, onMessage, onConnectionChange } = options;
  const [isConnected, setIsConnected] = useState(false);

  // Handle connection changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    onConnectionChange?.(connected);
  }, [onConnectionChange]);

  // Handle incoming messages
  const handleMessage = useCallback((message: { type: string; data: any }) => {
    onMessage?.(message.type, message.data);
  }, [onMessage]);

  // Connect to WebSocket
  const connect = useCallback(async (authToken?: string) => {
    try {
      await websocketService.connect(authToken || token);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      throw error;
    }
  }, [token]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  // Send message through WebSocket
  const send = useCallback((type: string, data: any) => {
    websocketService.send(type, data);
  }, []);

  // Subscribe to message type
  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    return websocketService.subscribe(type, handler);
  }, []);

  // Set up connection and message handlers
  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribeConnection = websocketService.onConnectionChange(handleConnectionChange);
    
    // Subscribe to all messages if handler provided
    let unsubscribeMessage: (() => void) | undefined;
    if (onMessage) {
      unsubscribeMessage = websocketService.subscribe('*', handleMessage);
    }

    // Auto-connect if enabled
    if (autoConnect) {
      connect(token).catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      unsubscribeConnection();
      if (unsubscribeMessage) {
        unsubscribeMessage();
      }
    };
  }, [autoConnect, token, handleConnectionChange, handleMessage, connect, onMessage]);

  return {
    isConnected,
    connect,
    disconnect,
    send,
    subscribe,
  };
}

export default useWebSocket;