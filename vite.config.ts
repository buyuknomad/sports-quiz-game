import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          socket: ['socket.io-client']
        }
      }
    },
    sourcemap: false,
    // Ensure static assets are placed in the correct directory
    assetsDir: 'assets',
    // Generate a 404.html that redirects to index.html for SPA routing
    outDir: 'dist'
  }
})