import { test, expect } from '@playwright/test'
import { login, PASSWORD } from './helpers/auth'

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
    // `/login` y ya no `/`: desde que existe la landing comercial, la raíz es el
    // escaparate —con un ENLACE «Iniciar sesión», no el formulario—, así que este
    // caso llevaba esperando 30 s a un botón que ya no estaba en esa ruta.
    await page.goto('/login')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByText('Campo requerido').first()).toBeVisible()
    // Sigue en el login (el botón de login continúa presente).
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  // --- Guard: ruta protegida sin sesión ---
  test('abrir /dashboard sin sesión redirige al login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('muestra el motivo cuando otra sesión reemplazó la actual', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'vetsoft.auth.session-replaced',
        'Tu cuenta se inició en otro dispositivo.',
      )
    })
    await page.goto('/login')

    await expect(page.getByText('Tu cuenta se inició en otro dispositivo.')).toBeVisible()
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
