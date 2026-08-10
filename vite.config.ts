import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL?.trim()
  const configuredProfile = env.VETSOFTWARE_PROFILE?.trim()

  if (mode !== 'test' && configuredProfile !== mode) {
    throw new Error(`Missing or mismatched environment file for Vite mode "${mode}".`)
  }

  if (mode !== 'localdev' && mode !== 'test' && !apiUrl) {
    throw new Error(`VITE_API_URL is required for Vite mode "${mode}".`)
  }

  return {
    plugins: [vue(), vuetify({ autoImport: true })],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      // Pinado: el objetivo por defecto de Vite cambia entre versiones mayores, y
      // un salto silencioso mueve el tamaño del bundle sin que nadie lo pida.
      target: 'es2022',

      // Nunca se publican mapas de código, tampoco en dev: el entorno de dev es
      // accesible desde internet y un mapa entrega el fuente completo a quien
      // abra las herramientas del navegador. Para depurar, se construye en local.
      sourcemap: false,

      // Por defecto son 500 kB. El chunk más grande hoy ronda los 90 kB, así que
      // 200 avisa cuando algo empieza a engordar, no cuando ya es tarde.
      chunkSizeWarningLimit: 200,

      // Sin `manualChunks`, y es una decisión medida, no un olvido. Se probó la
      // configuración por familias (vuetify / vue / axios / iconos) sobre este
      // mismo proyecto y empeora lo que más importa:
      //
      //   automático de Vite (esto)   ruta crítica 102,9 KB gzip
      //   vendor por familias         ruta crítica 128,8 KB gzip   (+25 %)
      //
      // El argumento a favor era la caché, y tampoco la arregla: el porcentaje de
      // JS invalidado por un cambio de una línea baja del 85 % al 71 %, que sigue
      // siendo casi todo. Pagar 26 KB de ruta crítica —lo que el usuario espera
      // antes de ver nada— por eso no sale a cuenta.
      //
      // La cascada de invalidación es un problema real de este repositorio y está
      // documentada en scripts/check-bundle-budget.mjs. Su causa no es el vendor.
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
  }
})
