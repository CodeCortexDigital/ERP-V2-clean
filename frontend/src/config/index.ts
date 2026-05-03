/**
 * Centralized Configuration for ERP V2 Frontend
 * All environment variables and app settings are managed here
 */

// API Configuration
export const config = {
  api: {
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
    prefix: import.meta.env.VITE_API_PREFIX || '/api',
    timeout: 30000,
  },
  
  // WebSocket Configuration
  websocket: {
    url: import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws',
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
  },
  
  // App Information
  app: {
    name: import.meta.env.VITE_APP_NAME || 'ERP V2',
    version: import.meta.env.VITE_APP_VERSION || '2.0.0',
    environment: import.meta.env.VITE_APP_ENV || 'development',
  },
  
  // Feature Flags
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    websocket: import.meta.env.VITE_ENABLE_WEBSOCKET === 'true',
    notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  },
  
  // Pagination
  pagination: {
    defaultPageSize: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 10,
    maxPageSize: parseInt(import.meta.env.VITE_MAX_PAGE_SIZE) || 100,
  },
  
  // Cache Configuration
  cache: {
    timeout: parseInt(import.meta.env.VITE_CACHE_TIMEOUT) || 300000,
  },
};

// Helper to get full API URL
export const getApiUrl = (endpoint: string) => {
  return `${config.api.baseURL}${config.api.prefix}${endpoint}`;
};

// Helper to check if running in production
export const isProduction = () => {
  return config.app.environment === 'production';
};

// Helper to check if running in development
export const isDevelopment = () => {
  return config.app.environment === 'development';
};

export default config;