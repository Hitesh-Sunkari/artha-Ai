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
    },
  },
})
