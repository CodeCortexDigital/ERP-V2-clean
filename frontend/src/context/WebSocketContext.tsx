import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { websocketService, type MessageHandler, type ConnectionHandler } from '../services/websocket.service';

interface WebSocketContextType {
  isConnected: boolean;
  connect: (token?: string) => Promise<void>;
  disconnect: () => void;
  send: (type: string, data: any) => void;
  subscribe: (type: string, handler: MessageHandler) => () => void;
  onConnectionChange: (handler: ConnectionHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  token?: string;
}

export function WebSocketProvider({ 
  children, 
  autoConnect = true,
  token 
}: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);

  // Handle connection changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

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

  // Subscribe to connection state changes
  const onConnectionChange = useCallback((handler: ConnectionHandler) => {
    return websocketService.onConnectionChange(handler);
  }, []);

  // Set up connection handler
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionChange(handleConnectionChange);
    
    // Auto-connect if enabled
    if (autoConnect) {
      connect(token).catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }

    return () => {
      unsubscribe();
    };
  }, [autoConnect, token, handleConnectionChange, connect]);

  const value: WebSocketContextType = {
    isConnected,
    connect,
    disconnect,
    send,
    subscribe,
    onConnectionChange,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
}

export default WebSocketContext;