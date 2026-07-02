import { type Page } from '@playwright/test'

/** Credenciales de prueba — vienen del entorno, nunca hardcodeadas. */
export const EMPLOYEE_CODE = 'O'
export const PASSWORD = 'Orlando1997*'

/**
 * Rellena el formulario de login y envía. Los selectores usan el rol/label
 * accesibles del LoginForm (Vuetify v-text-field + v-btn), no clases CSS,
 * para que sobrevivan cambios de estilo.
 */
export async function login(
  page: Page,
  code: string = EMPLOYEE_CODE,
  password: string = PASSWORD,
): Promise<void> {
  await page.goto('/')
  // Labels exactos: el toggle de ver/ocultar contraseña también expone un
  // aria-label "Contraseña * appended action", así que un match parcial
  // resolvería a 2 elementos (strict mode). exact:true apunta solo al input.
  await page.getByLabel('Código de empleado *', { exact: true }).fill(code)
  await page.getByLabel('Contraseña *', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}
