import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/ready': 'http://127.0.0.1:8000',
      '/research': 'http://127.0.0.1:8000',
      '/runs': 'http://127.0.0.1:8000',
      '/evaluation': 'http://127.0.0.1:8000',
      '/system': 'http://127.0.0.1:8000',
      '/portfolio': 'http://127.0.0.1:8000',
      '/committee': 'http://127.0.0.1:8000',
      '/rag': 'http://127.0.0.1:8000',
      '/copilot': 'http://127.0.0.1:8000',
      '/market': 'http://127.0.0.1:8000',
      '/securities': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
      '/data': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/telemetry': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
    },
  },
})
