import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E — casos de prueba escritos en código (alternativa local a
 * TestSprite). La app debe estar corriendo en http://localhost:5174
 * (`npm run dev`), que ya proxya /api al backend sin CORS.
 *
 * Credenciales por variable de entorno (nunca hardcodeadas):
 *   E2E_EMPLOYEE_CODE (default "O")
 *   E2E_PASSWORD      (requerida para los casos que hacen login)
 *
 * Ejecutar:  npm run e2e        (headless)
 *            npm run e2e:ui     (modo interactivo)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Reusa el server si ya está arriba; si no, lo levanta.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
