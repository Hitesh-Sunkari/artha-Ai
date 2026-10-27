import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/health': 'http://127.0.0.1:8001',
      '/ready': 'http://127.0.0.1:8001',
      '/research': 'http://127.0.0.1:8001',
      '/runs': 'http://127.0.0.1:8001',
      '/evaluation': 'http://127.0.0.1:8001',
      '/system': 'http://127.0.0.1:8001',
      '/portfolio': 'http://127.0.0.1:8001',
      '/committee': 'http://127.0.0.1:8001',
      '/rag': 'http://127.0.0.1:8001',
      '/copilot': 'http://127.0.0.1:8001',
      '/market': 'http://127.0.0.1:8001',
    },
  },
})
