import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Esto ayuda con el enrutamiento en producción
  server: {
    historyApiFallback: true,
  }
})