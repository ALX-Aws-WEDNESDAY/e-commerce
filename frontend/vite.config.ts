import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 3000,
    proxy: {
      '/api/users': 'http://localhost:8003',
      '/api/products': 'http://localhost:8001',
      '/api/categories': 'http://localhost:8001',
      '/api/cart': 'http://localhost:8004',
      '/api/orders': 'http://localhost:8004',
    },
  },
})
