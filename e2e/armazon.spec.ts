import { expect, test, type Page } from '@playwright/test'
import { enrutarApi, instalarSesion } from './helpers/sesion'

/**
 * EL ARMAZÓN AUTENTICADO — la barra lateral que sale en las 40 pantallas de
 * `/dashboard`.
 *
 * <p>Se prueba con la sesión y la API simuladas (`helpers/sesion.ts`) y no con
 * un login real: lo que se comprueba es semántica de interfaz —roles, nombres
 * accesibles, `aria-current`, `aria-expanded`— y hacerlo depender del backend lo
 * dejaría sin ejecutarse en la máquina de quien no tiene credenciales, que es
 * donde más falta hace.
 *
 * <p>Los dos anchos no son decoración: 1440 es el escritorio de recepción y 1024
 * el de la tablet de planta, que es el punto donde el raíl se colapsa. El
 * selector de sede se ocultaba justo por debajo de ese ancho, dejando al usuario
 * escribiendo en una sede que no podía ver.
 */

const ESCRITORIO = { width: 1440, height: 900 }
const TABLET = { width: 1024, height: 800 }

/** El armazón lo monta cualquier pantalla de `/dashboard`; el tablero es la más barata. */
async function abrirArmazon(page: Page, permisos: string[] = ['appointment.read']): Promise<void> {
  await instalarSesion(page)
  // `GET /appointments` devuelve un ARRAY: el comodín de `enrutarApi` sirve un
  // objeto con forma de página, y el tablero hace `.filter()` sobre lo que
  // llegue. Servirle el comodín revienta el árbol entero y el fallo que se ve es
  // «no encuentro la navegación» en una pantalla que sí existe.
  await enrutarApi(page, { '/appointments*': [] }, { permisos })
  await page.goto('/dashboard')
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
}

test.describe('Armazón autenticado', () => {
  test('la barra lateral es una navigation con nombre, no un aside mudo', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO)
    await abrirArmazon(page)

    // Era un `<aside>`: un lector lo anunciaba como «complementario», así que la
    // navegación principal de la aplicación no aparecía en su lista de regiones
    // y no había forma de saltar a ella.
    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    await expect(nav).toHaveCount(1)
  })

  test('la pantalla abierta se anuncia con aria-current, y solo una', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO)
    await abrirArmazon(page)

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    // Sin `aria-current` el lector no dice dónde está: la única señal de la
    // pantalla activa era un color de fondo, que §1.4.1 no admite como único
    // medio. Y más de uno marcado es tan inútil como ninguno.
    const actual = nav.locator('[aria-current="page"]')
    await expect(actual).toHaveCount(1)
    await expect(actual).toHaveText('Tablero')

    // Se navega además a otra pantalla porque lo que hay que sujetar es que la
    // marca se MUEVA: un atributo clavado en una sola entrada satisface igual de
    // bien cualquier afirmación hecha sobre una única pantalla.
    await page.getByRole('button', { name: 'Agenda' }).click()
    await expect(page).toHaveURL(/\/dashboard\/agenda$/)

    await expect(actual).toHaveCount(1)
    await expect(actual).toHaveText('Agenda')
  })

  test('los desplegables declaran si están abiertos', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO)
    await abrirArmazon(page)

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    const plegables = nav.locator('button[aria-expanded]')
    await expect(plegables.first()).toBeVisible()

    const primero = plegables.first()
    const antes = await primero.getAttribute('aria-expanded')
    await primero.click()
    // El atributo tiene que MOVERSE al pulsar: dejarlo clavado en «false» es el
    // fallo silencioso de este arreglo, y se lee igual de bien en el marcado.
    await expect(primero).not.toHaveAttribute('aria-expanded', antes ?? '')
  })

  test('el selector de sede sigue ahí a 1024 px, que es la tablet de planta', async ({ page }) => {
    await page.setViewportSize(TABLET)
    await abrirArmazon(page)

    // La sede persistida decide en qué sucursal se ESCRIBE cada petición. El
    // raíl colapsado lo ocultaba, así que el único sitio que dice sobre cuál se
    // está trabajando desaparecía sin que se dejara de aplicar.
    const sede = page.getByRole('combobox', { name: /sede/i })
    await expect(sede).toBeVisible()
  })

  test('el panel de sedes no sale truncado en el raíl colapsado', async ({ page }) => {
    await page.setViewportSize(TABLET)
    await abrirArmazon(page)

    await page.getByRole('combobox', { name: /sede/i }).click()
    const panel = page.getByRole('listbox')
    await expect(panel).toBeVisible()

    const caja = await panel.boundingBox()
    if (caja === null) throw new Error('el panel abierto no tiene caja que medir')
    // El raíl mide 52 px: sin el suelo, el panel copia el ancho del disparador y
    // «Sede E2E de prueba» sale cortado a un par de caracteres.
    expect(caja.width).toBeGreaterThanOrEqual(220)
  })

  test('«Nueva consulta» se llama igual con el raíl abierto que colapsado', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO)
    await abrirArmazon(page, ['appointment.read', 'consultation.create'])

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    await nav.getByRole('button', { name: 'Consulta', exact: true }).click()

    // Las dos instantáneas no alcanzan este control —el acordeón arranca plegado y
    // su perfil no trae `consultation.create`—, así que el rótulo de repuesto del
    // raíl no lo comprobaría nadie más. `exact` es lo que hace útil al caso: el
    // fallo por defecto es quedarse sin nombre al colapsar (§4.1.2) y el fallo del
    // arreglo es anunciarlo dos veces sin colapsar, y los dos dan cero aquí.
    const nueva = nav.getByRole('button', { name: 'Nueva consulta', exact: true })
    await expect(nueva).toHaveCount(1)

    await page.setViewportSize(TABLET)
    await expect(nueva).toHaveCount(1)
  })

  test('conserva su semántica a 1440', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO)
    await abrirArmazon(page)

    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' }),
    ).toMatchAriaSnapshot({ name: 'armazon-1440.aria.yml' })
  })

  test('conserva su semántica a 1024', async ({ page }) => {
    await page.setViewportSize(TABLET)
    await abrirArmazon(page)

    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' }),
    ).toMatchAriaSnapshot({ name: 'armazon-1024.aria.yml' })
  })
})
