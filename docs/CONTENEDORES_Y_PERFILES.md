# Contenedores y perfiles

Los scripts públicos representan los perfiles del sistema:

| Perfil | Desarrollo | Build | API | Login administrativo |
|---|---|---|---|---|
| local | `npm run dev:local` | `npm run build:local` | `http://localhost:8080` | `http://localhost:5173/login` |
| dev | `npm run dev:dev` | `npm run build:dev` | `https://dev-api.vetsoftware.co` | `https://dev-admin.vetsoftware.co/login` |
| prod | `npm run dev:prod` | `npm run build:prod` | `https://api.vetsoftware.co` | `https://admin.vetsoftware.co/login` |

Vite reserva la palabra `local`, por lo que el script usa internamente el modo técnico `localdev`; la interfaz del proyecto continúa siendo `local/dev/prod` y carga `.env.local`.

El `Dockerfile` construye `prod` por omisión y sirve la SPA con nginx no-root en el puerto 8080. La configuración aplica fallback a `index.html`, compresión, caché prolongada de assets, cabeceras de seguridad y `/health`.

La release exige la variable GitHub `VITE_RECAPTCHA_SITE_KEY` y la incorpora durante el build. La site key es pública, pero debe corresponder a los dominios reales. No coloque secretos en archivos `VITE_*`: sus valores quedan incluidos en el JavaScript entregado al navegador.
