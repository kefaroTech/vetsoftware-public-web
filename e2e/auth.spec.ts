import { test, expect } from '@playwright/test'
import { login, EMPLOYEE_CODE, PASSWORD } from './helpers/auth'

/**
 * Ejemplo de suite que describe casos como TestSprite, pero en código.
 * Incluye happy path y varios casos de error/borde. Amplía este patrón
 * (un archivo por feature) para cubrir el resto del plan.
 */
test.describe('Autenticación y guard de sesión', () => {
  // --- Happy path ---
  test('login válido entra al dashboard', async ({ page }) => {
    test.skip(!PASSWORD, 'Define E2E_PASSWORD para correr los casos con login')
    await login(page)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  // --- Error: validación de campos vacíos ---
  test('campos vacíos muestran "Campo requerido" y no navega', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByText('Campo requerido').first()).toBeVisible()
    // Sigue en el login (el botón de login continúa presente).
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  // --- Error: credenciales inválidas ---
  test('credenciales inválidas muestran alerta y no entra', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(/Código de empleado/).fill('no-existe')
    await page.getByLabel(/Contraseña/).fill('contraseña-incorrecta')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  // --- Guard: ruta protegida sin sesión ---
  test('abrir /dashboard sin sesión redirige al login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  // --- Guard: guestOnly ---
  test('estando logueado, / redirige al dashboard', async ({ page }) => {
    test.skip(!PASSWORD, 'Define E2E_PASSWORD para correr los casos con login')
    await login(page)
    await expect(page).toHaveURL(/\/dashboard/)
    await page.goto('/')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
