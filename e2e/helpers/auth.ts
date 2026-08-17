import { type Page } from '@playwright/test'

/**
 * Credenciales de prueba — vienen del entorno, nunca hardcodeadas.
 *
 * <p>Hasta FE-05 esto era mentira: la constante traía una contraseña personal escrita a mano en el
 * fichero, así que `PASSWORD` era siempre verdadera y los `test.skip(!PASSWORD, …)` repartidos por
 * la suite nunca se disparaban — eran código muerto que aparentaba una protección inexistente.
 * Ahora no hay valor por defecto para la contraseña: sin `E2E_PASSWORD` en el entorno, las suites
 * que hacen login se saltan solas, que es lo que su guarda decía hacer desde el principio.
 *
 * <p>El código de empleado sí conserva un valor por defecto porque no es un secreto: identifica al
 * usuario, no lo autentica.
 */
export const EMPLOYEE_CODE = process.env.E2E_EMPLOYEE_CODE ?? 'O'
export const PASSWORD = process.env.E2E_PASSWORD ?? ''

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
