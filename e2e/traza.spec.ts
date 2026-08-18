import { test, expect, type Page } from '@playwright/test'

/**
 * TR-05 en un navegador de verdad.
 *
 * <p>El front ya no genera `traceparent`: lo hizo durante un tiempo, pero el `span-id` de padre
 * que fabricaba no correspondía a ningún span real —no hay OpenTelemetry en el navegador—, y el
 * backend, fiel al estándar W3C, adoptaba esa traza y colgaba su propio span de un padre
 * inexistente. Resultado verificado en Tempo: el 100 % de las trazas del sistema quedaban sin
 * raíz. Se decidió que el backend sea quien origina la traza (ver el comentario de `getTraceId`
 * en `http.client.ts`).
 *
 * <p>Estas pruebas no llaman al backend: interceptan la petición con `route`, que es el punto
 * donde se ve lo que el navegador iba a enviar o recibir de verdad. Por eso pueden correr en el
 * *smoke* de CI junto a las dos de autenticación, sin credenciales ni servidor.
 */

/** El login es la única pantalla que llama a la API sin sesión previa. */
async function intentarEntrar(page: Page) {
  await page.goto('/login')
  // Por placeholder: el label de AuthField no queda asociado al input, y el helper de login
  // usa selectores de una version anterior del formulario.
  await page.getByPlaceholder('ADMIN-001').fill('quien-sea')
  await page.getByPlaceholder('••••••••').fill('lo-que-sea')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
}

test.describe('propagación de la traza', () => {
  test('el aviso de error muestra el identificador aunque la respuesta no traiga X-Trace-Id', async ({
    page,
  }) => {
    // Sin la cabecera `X-Trace-Id` (el caso de un proxy que la filtra): el backend también deja
    // el trace-id dentro del propio `ProblemDetail` (`GlobalExceptionHandler.problem()` lo toma
    // del span actual del servidor), así que el aviso lo puede mostrar igual sin depender de la
    // cabecera de respuesta ni de nada que genere el navegador.
    const traceId = 'a1b2c3d4e5f60708a1b2c3d4e5f60708'
    await page.route('**/auth/login/employee', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'Error',
          status: 500,
          detail: 'Fallo del servidor',
          traceId,
        }),
      })
    })

    await intentarEntrar(page)

    // El identificador se pinta en el aviso, monoespaciado y con botón de copiar.
    await expect(page.locator('.toast-trace-id')).toHaveText(traceId)
  })

  test('una peticion que no llega al backend no tiene trace-id que mostrar', async ({ page }) => {
    // Contrapartida aceptada a sabiendas al decidir que el backend origine la traza (ver arriba):
    // sin generación en el cliente, una petición que muere antes de llegar al servidor —timeout,
    // red caída— no tiene ninguna fuente de la que sacar un identificador, porque no hay
    // `X-Trace-Id` de respuesta ni `ProblemDetail`. Este test documenta que es así a propósito:
    // si alguien reintroduce el `traceparent` del navegador para "arreglar" este caso, se pone en
    // rojo y le obliga a leer por qué se quitó.
    await page.route('**/auth/login/employee', (route) => route.abort('connectionrefused'))

    await intentarEntrar(page)

    await expect(page.locator('.toast-trace-id')).toHaveCount(0)
  })
})
