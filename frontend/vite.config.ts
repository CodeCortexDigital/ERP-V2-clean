import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Backend for the dev proxy (relative /api and /media URLs). demo.bat uses 8001.
const backend = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // HMR connects back to whatever port the dev server runs on (e.g. --port 5179).
    hmr: {
      overlay: true,
      protocol: 'ws',
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '/media': {
        target: backend,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})