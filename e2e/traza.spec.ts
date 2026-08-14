import { test, expect, type Page } from '@playwright/test'

/**
 * TR-05 en un navegador de verdad.
 *
 * <p>Las pruebas unitarias comprueban el generador y el interceptor sustituyendo el adaptador de
 * axios; el backend comprueba que adopta el identificador (`TraceparentPropagationIT`). Lo que
 * ninguna de las dos puede afirmar es que **la cabecera salga del navegador**: entre el
 * interceptor y el socket están XHR, la política de CORS y el propio Chrome, que descarta
 * cabeceras no permitidas sin avisar a nadie.
 *
 * <p>Estas pruebas no llaman al backend: interceptan la petición con `route`, que es el punto
 * donde se ve lo que el navegador iba a enviar de verdad. Por eso pueden correr en el *smoke* de
 * CI junto a las dos de autenticación, sin credenciales ni servidor.
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
  test('el navegador envía traceparent con el formato del estándar', async ({ page }) => {
    const cabeceras: string[] = []
    await page.route('**/auth/login/employee', async (route) => {
      const traceparent = route.request().headers()['traceparent']
      if (traceparent) cabeceras.push(traceparent)
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({ title: 'Unauthorized', status: 401, detail: 'Credenciales' }),
      })
    })

    await intentarEntrar(page)

    expect(cabeceras.length, 'la petición salió sin traceparent').toBeGreaterThan(0)
    expect(cabeceras[0]).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
  })

  test('el aviso de error muestra el identificador aunque la respuesta no lo traiga', async ({
    page,
  }) => {
    // Sin `X-Trace-Id` en la respuesta: es el caso de un proxy que la filtra, y también el de
    // una petición que muere sin llegar. El identificador tiene que salir del propio navegador.
    let enviado = ''
    await page.route('**/auth/login/employee', async (route) => {
      enviado = route.request().headers()['traceparent']?.split('-')[1] ?? ''
      await route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({ title: 'Error', status: 500, detail: 'Fallo del servidor' }),
      })
    })

    await intentarEntrar(page)

    // El identificador se pinta en el aviso, monoespaciado y con botón de copiar.
    await expect(page.locator('.toast-trace-id')).toHaveText(enviado)
  })

  test('el identificador aparece cuando la petición muere sin respuesta', async ({ page }) => {
    // El caso que da nombre al hallazgo: «se quedó cargando». No hay respuesta que leer, así que
    // si el identificador no lo hubiera generado el navegador, no habría nada que enseñar.
    await page.route('**/auth/login/employee', (route) => route.abort('connectionrefused'))

    await intentarEntrar(page)

    await expect(page.locator('.toast-trace-id')).toHaveText(/^[0-9a-f]{32}$/)
  })
})
