import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
 
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mui': ['@mui/material', '@mui/icons-material'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'utils': ['@/utils/formatPrice', '@/lib/utils']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})