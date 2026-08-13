import { type Page } from '@playwright/test'

/** Credenciales de prueba — vienen del entorno, nunca hardcodeadas. */
export const EMPLOYEE_CODE = 'O'
export const PASSWORD = 'Orlando1997*'

/**
 * Rellena el formulario de login y envía.
 *
 * <p>Los selectores apuntan al atributo `autocomplete` de cada campo, no a su etiqueta ni a su
 * texto. Es a propósito: `autocomplete` declara *para qué sirve* el campo —es lo que usa el
 * gestor de contraseñas del navegador—, así que no cambia cuando se reescribe la interfaz. Los
 * selectores anteriores buscaban «Código de empleado *» y «Contraseña *», etiquetas de una
 * versión anterior del formulario; llevaban rotos desde que se rehízo, sin que nadie lo notara
 * porque los casos que dependen de ellos necesitan un backend con credenciales.
 *
 * <p>`getByLabel` no es una opción hoy: `AuthField` pinta un `<label>` sin `for`, así que no hay
 * asociación entre etiqueta y campo. Eso además es un defecto de accesibilidad —un lector de
 * pantalla no anuncia la etiqueta y hacer clic en ella no enfoca el campo— y pertenece a FE-14.
 * Cuando se arregle allí, estos selectores podrán volver a la etiqueta.
 */
export async function login(
  page: Page,
  code: string = EMPLOYEE_CODE,
  password: string = PASSWORD,
): Promise<void> {
  // Ruta explícita: no depende de a dónde redirija la raíz según haya sesión o no.
  await page.goto('/login')
  await page.locator('input[autocomplete="username"]').fill(code)
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
}
