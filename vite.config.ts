import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    // Puerto fijo: si 5174 está ocupado, falla en vez de saltar a 5175/5176. Así el enlace de
    // verificación del backend (verification-base-url → :5174) y el CORS allowlist siempre coinciden.
    strictPort: true,
    // Proxy API calls to the backend so the browser only ever talks to the
    // Vite origin (no CORS). Enables access from other LAN devices (tablet,
    // phone) via `npm run dev -- --host` without touching the backend's CORS
    // allowlist. Active only when VITE_API_URL is empty (relative baseURL).
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // The backend's CORS allowlist only accepts http://localhost:5174.
        // A LAN device (tablet) sends Origin: http://<pc-ip>:5174, which the
        // backend rejects with 403. Rewrite the forwarded Origin to the
        // allowed one so the proxied request is accepted. Safe because the
        // browser request is same-origin (no CORS enforcement client-side).
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:5174')
          })
        },
      },
    },
  },
})
