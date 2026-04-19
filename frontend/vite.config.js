import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/monitoring/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/admin/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/sim-takip/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/hr-requests': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/m365': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/master-data': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
