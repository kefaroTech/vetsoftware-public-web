import { defineConfig, devices } from '@playwright/test'

/**
 * Arnés de CAPTURA y MEDIDA para la auditoría de UX. Configuración propia y
 * separada de las otras dos.
 *
 * <p>No es regresión visual: no compara contra `visual/__screenshots__/`, no
 * declara `snapshotPathTemplate` y no llama a `toHaveScreenshot`. Produce PNG y
 * JSON, y su único criterio de fallo es que el arnés no pueda ejecutarse.
 *
 * <p>`testMatch` sobre `.uxa.ts` y no `.spec.ts`: `playwright.config.ts` apunta a
 * `./e2e` con el `testMatch` por defecto, así que un fichero `.spec.ts` en esta
 * carpeta entraría en `npm run e2e` y cambiaría la suite de todo el mundo.
 */
export default defineConfig({
  testDir: './e2e/uxcapture',
  testMatch: /.*\.uxa\.ts/,
  fullyParallel: true,
  // Cada prueba recorre decenas de rutas: reintentar duplicaría media hora de
  // navegador para volver a fotografiar lo mismo. Una ruta que falla se anota
  // dentro del propio bucle, que es donde el dato sirve.
  retries: 0,
  workers: 4,
  timeout: 25 * 60_000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          'C:/Users/ORLAND~1/AppData/Local/Temp/claude/C--Users-Orlando-Velasquez-Documents-Proyectos-MainVetSoftware/f56969b5-ac11-4b7e-87fc-3e60aee284b8/scratchpad/uxa-informe-public.json',
      },
    ],
  ],
  outputDir: 'test-results/uxcapture',

  use: {
    baseURL: process.env.UXA_BASE_URL ?? 'http://localhost:5174',
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
