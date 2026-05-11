export type MessageHandler = (message: { type: string; data: any }) => void
export type ConnectionHandler = (connected: boolean) => void

export const websocketService = {
  connect: async (_token?: string): Promise<void> => {
    // Placeholder for WebSocket connect logic
  },
  disconnect: () => {
    // Placeholder for WebSocket disconnect logic
  },
  send: (_type: string, _data: any) => {
    // Placeholder for send logic
  },
  subscribe: (_type: string, _handler: MessageHandler) => {
    // Placeholder for subscribe logic
    return () => {
      // cleanup subscription
    }
  },
  onConnectionChange: (_handler: ConnectionHandler) => {
    // Placeholder for connection state subscription
    return () => {
      // cleanup connection handler
    }
  }
}
